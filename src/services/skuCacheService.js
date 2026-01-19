import db from '../db.js';
import { DateTime } from 'luxon';

const CACHE_TTL_HOURS = 24;

export const getSkuMap = (productId, countryPath) => {
  const rows = db.prepare(`
    SELECT size_name, sku, cached_at
    FROM sku_cache
    WHERE product_id = ? AND country_path = ?
  `).all(productId, countryPath);

  if (!rows.length) return null;
  const now = DateTime.utc();
  const fresh = rows.every((row) => {
    const cachedAt = DateTime.fromISO(row.cached_at, { zone: 'utc' });
    return cachedAt.isValid && cachedAt.plus({ hours: CACHE_TTL_HOURS }) > now;
  });

  if (!fresh) {
    db.prepare('DELETE FROM sku_cache WHERE product_id = ? AND country_path = ?').run(productId, countryPath);
    return null;
  }

  const map = new Map();
  for (const row of rows) {
    map.set(row.size_name, row.sku);
  }
  return map;
};

export const saveSkuMap = (productId, countryPath, storeId, colorProductId, sizeToSku) => {
  const now = DateTime.utc().toISO();
  const insert = db.prepare(`
    INSERT INTO sku_cache (product_id, country_path, store_id, color_product_id, size_name, sku, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM sku_cache WHERE product_id = ? AND country_path = ?').run(productId, countryPath);
    for (const [sizeName, sku] of sizeToSku.entries()) {
      insert.run(productId, countryPath, storeId, colorProductId, sizeName, sku, now);
    }
  });

  transaction();
};
