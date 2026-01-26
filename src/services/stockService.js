import { DateTime } from 'luxon';
import zaraClient from './zaraClient.js';
import { getSkuMap, saveSkuMap } from './skuCacheService.js';
import { normalizeSizes, updateWatchStatus } from './watchService.js';
import { sendTelegram } from './telegramNotifier.js';
import config from '../config.js';

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

const extractAvailableStores = (stores) => {
  if (!Array.isArray(stores)) return [];
  const available = [];
  for (const store of stores) {
    if (store?.isPickupAllowed) {
      available.push({
        id: store.id,
        name: store.commercialName || store.name,
        city: store.city,
        message: null,
        reason: 'pickup'
      });
      continue;
    }
    const capacity = store?.physicalStoresCapacity;
    if (capacity && capacity.fullAvailability === true && (capacity.reason === null || capacity.reason === undefined)) {
      available.push({
        id: store.id,
        name: store.commercialName || store.name,
        city: store.city,
        message: capacity.message || null,
        reason: 'capacity'
      });
    }
  }
  return available;
};

const formatStoreSummary = (stores) => {
  if (!stores.length) return 'No nearby stores available.';
  const lines = stores.slice(0, 5).map((store) => {
    const base = `${store.name} (${store.city || 'N/A'})`;
    if (store.reason === 'pickup') return `${base} - Pickup available`;
    if (store.message) return `${base} - ${store.message}`;
    return `${base} - In-store availability`;
  });
  return lines.join('\n');
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
    let storeSummary = null;
    try {
      const stores = await zaraClient.fetchStoreLocator(
        watchItem.country_path,
        config.zara.storeLocatorLat,
        config.zara.storeLocatorLng,
        config.zara.storeLocatorRadius
      );
      const availableStores = extractAvailableStores(stores);
      storeSummary = formatStoreSummary(availableStores);
    } catch (err) {
      console.warn(`Store locator failed for productId=${watchItem.product_id}: ${err.message}`);
    }

    await sendTelegram({
      productId: watchItem.product_id,
      countryPath: watchItem.country_path,
      wantedSizes,
      storeSummary
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
