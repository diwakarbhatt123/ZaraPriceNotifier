import { DateTime } from 'luxon';
import zaraClient from './zaraClient.js';
import { getSkuMap, saveSkuMap } from './skuCacheService.js';
import { normalizeSizes, updateWatchStatus } from './watchService.js';
import { sendTelegram } from './telegramNotifier.js';

const buildSizeSkuMap = (productDetails, productId) => {
  if (!Array.isArray(productDetails) || productDetails.length === 0) {
    throw new Error('Empty product details response');
  }
  const item = productDetails[0];
  const colors = item?.detail?.colors || [];
  let chosen = colors.find((color) => Number(color.productId) === Number(productId));
  if (!chosen) {
    chosen = colors[0];
  }
  if (!chosen) {
    throw new Error('No colors in product details');
  }

  const sizeMap = new Map();
  const sizes = chosen.sizes || [];
  for (const size of sizes) {
    const name = String(size.name || '').toUpperCase();
    if (name && size.sku) {
      sizeMap.set(name, Number(size.sku));
    }
  }
  return { sizeMap, colorProductId: chosen.productId };
};

const buildSkuAvailabilityMap = (availability) => {
  const map = new Map();
  for (const entry of availability?.skusAvailability || []) {
    map.set(Number(entry.sku), String(entry.availability || '').toLowerCase());
  }
  return map;
};

const notifiableStatuses = new Set(['in_stock', 'low_on_stock']);

const isAnyInStock = (skus, availabilityMap) => {
  for (const sku of skus) {
    if (notifiableStatuses.has(availabilityMap.get(Number(sku)))) {
      return true;
    }
  }
  return false;
};

export const checkStockForItem = async (watchItem) => {
  const now = DateTime.utc().toISO();
  const wantedSizes = normalizeSizes(watchItem.wantedSizes || []);

  let sizeMap = getSkuMap(watchItem.product_id, watchItem.country_path);
  if (!sizeMap) {
    const productDetails = await zaraClient.fetchProductDetails(watchItem.country_path, watchItem.product_id);
    const { sizeMap: freshMap, colorProductId } = buildSizeSkuMap(productDetails, watchItem.product_id);
    sizeMap = freshMap;
    saveSkuMap(watchItem.product_id, watchItem.country_path, watchItem.store_id, colorProductId, sizeMap);
  }

  const availability = await zaraClient.fetchAvailability(watchItem.store_id, watchItem.product_id);
  const availabilityMap = buildSkuAvailabilityMap(availability);

  let inStock = false;
  if (wantedSizes.length === 0) {
    inStock = isAnyInStock(availabilityMap.keys(), availabilityMap);
  } else {
    const targetSkus = [];
    for (const sizeName of wantedSizes) {
      if (sizeMap.has(sizeName)) {
        targetSkus.push(sizeMap.get(sizeName));
      } else {
        console.warn(`Size ${sizeName} not found for productId=${watchItem.product_id}`);
      }
    }
    inStock = isAnyInStock(targetSkus, availabilityMap);
  }

  const wasInStock = Boolean(watchItem.last_in_stock);
  if (!wasInStock && inStock) {
    await sendTelegram({
      productId: watchItem.product_id,
      countryPath: watchItem.country_path,
      wantedSizes
    });
    updateWatchStatus(watchItem.id, {
      lastInStock: inStock,
      lastCheckedAt: now,
      lastNotifiedAt: now
    });
  } else {
    updateWatchStatus(watchItem.id, {
      lastInStock: inStock,
      lastCheckedAt: now,
      lastNotifiedAt: watchItem.last_notified_at || null
    });
  }

  console.log(`Poll productId=${watchItem.product_id}, wantedSizes=[${wantedSizes.join(',')}], inStock=${inStock}`);
  return inStock;
};
