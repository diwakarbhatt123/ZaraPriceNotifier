import db from '../db.js';

const toUpperSizes = (sizes) => {
  if (!sizes || sizes.length === 0) return [];
  return sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
};

const serializeSizes = (sizes) => {
  const normalized = toUpperSizes(sizes);
  return normalized.length ? JSON.stringify(normalized) : null;
};

const parseSizes = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((s) => String(s).toUpperCase()) : [];
  } catch {
    return [];
  }
};

export const createWatchItem = (payload, defaults) => {
  const storeId = payload.storeId ?? defaults.storeIdDefault;
  const countryPath = payload.countryPath ?? defaults.countryPathDefault;
  const wantedSizesJson = serializeSizes(payload.wantedSizes);

  const stmt = db.prepare(`
    INSERT INTO watch_items (product_id, store_id, country_path, wanted_sizes_json)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(payload.productId, storeId, countryPath, wantedSizesJson);
  return getWatchItemById(result.lastInsertRowid);
};

export const listWatchItems = () => {
  const rows = db.prepare('SELECT * FROM watch_items ORDER BY id ASC').all();
  return rows.map((row) => ({
    ...row,
    wantedSizes: parseSizes(row.wanted_sizes_json)
  }));
};

export const getWatchItemById = (id) => {
  const row = db.prepare('SELECT * FROM watch_items WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    wantedSizes: parseSizes(row.wanted_sizes_json)
  };
};

export const deleteWatchItem = (id) => {
  const stmt = db.prepare('DELETE FROM watch_items WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
};

export const updateWatchStatus = (id, data) => {
  const stmt = db.prepare(`
    UPDATE watch_items
    SET last_in_stock = ?, last_checked_at = ?, last_notified_at = ?
    WHERE id = ?
  `);
  stmt.run(data.lastInStock ? 1 : 0, data.lastCheckedAt, data.lastNotifiedAt, id);
};

export const normalizeSizes = toUpperSizes;
