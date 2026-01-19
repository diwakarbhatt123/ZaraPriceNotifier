package com.example.zaranotifier.service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.zaranotifier.domain.dto.AvailabilityResponse;
import com.example.zaranotifier.domain.dto.ProductDetailsItem;
import com.example.zaranotifier.entity.SkuCacheEntity;
import com.example.zaranotifier.entity.WatchItemEntity;
import com.example.zaranotifier.notifier.Notifier;
import com.example.zaranotifier.repository.SkuCacheRepository;
import com.example.zaranotifier.service.ZaraMapper.SkuMapping;

@Service
public class StockService {
    private static final Logger log = LoggerFactory.getLogger(StockService.class);
    private static final Duration SKU_CACHE_TTL = Duration.ofHours(24);

    private final ZaraClient zaraClient;
    private final ZaraMapper zaraMapper;
    private final SkuCacheRepository skuCacheRepository;
    private final WatchService watchService;
    private final Notifier notifier;

    public StockService(ZaraClient zaraClient, ZaraMapper zaraMapper, SkuCacheRepository skuCacheRepository,
                        WatchService watchService, Notifier notifier) {
        this.zaraClient = zaraClient;
        this.zaraMapper = zaraMapper;
        this.skuCacheRepository = skuCacheRepository;
        this.watchService = watchService;
        this.notifier = notifier;
    }

    public void evaluateAndNotify(WatchItemEntity item) {
        Instant now = Instant.now();
        StockCheckResult result = checkStock(item);
        item.setLastCheckedAt(now);

        if (result.isAvailabilityChecked()) {
            boolean wasInStock = Boolean.TRUE.equals(item.getLastInStock());
            item.setLastInStock(result.isInStock());
            if (!wasInStock && result.isInStock()) {
                String message = buildNotificationMessage(item, result.getInStockSizes());
                notifier.notifyInStock(item, message);
                item.setLastNotifiedAt(now);
            }
        }

        watchService.save(item);

        log.info("Poll productId={}, wantedSizes={}, inStock={}, availabilityChecked={}",
                item.getProductId(), watchService.readWantedSizes(item),
                result.isInStock(), result.isAvailabilityChecked());
    }

    private StockCheckResult checkStock(WatchItemEntity item) {
        Map<String, Long> sizeToSku = loadSizeToSku(item);
        if (sizeToSku.isEmpty()) {
            log.warn("Empty size->sku mapping for productId={}, countryPath={}", item.getProductId(), item.getCountryPath());
            return StockCheckResult.notChecked();
        }

        List<String> wantedSizes = watchService.readWantedSizes(item);
        Set<String> targetSizes = new HashSet<>();
        if (wantedSizes.isEmpty()) {
            targetSizes.addAll(sizeToSku.keySet());
        } else {
            for (String size : wantedSizes) {
                targetSizes.add(size.toUpperCase(Locale.ROOT));
            }
        }

        AvailabilityResponse availability;
        try {
            availability = zaraClient.fetchAvailability(item.getStoreId(), item.getProductId()).block();
        } catch (Exception ex) {
            log.warn("Availability request failed for productId={}, storeId={}, error={}",
                    item.getProductId(), item.getStoreId(), ex.getMessage());
            return StockCheckResult.notChecked();
        }

        Map<Long, String> availabilityMap = new HashMap<>();
        if (availability != null && availability.getSkusAvailability() != null) {
            for (AvailabilityResponse.SkuAvailability skuAvailability : availability.getSkusAvailability()) {
                if (skuAvailability.getSku() != null && skuAvailability.getAvailability() != null) {
                    availabilityMap.put(skuAvailability.getSku(), skuAvailability.getAvailability());
                }
            }
        }

        boolean inStock = false;
        Set<String> inStockSizes = new HashSet<>();
        for (String size : targetSizes) {
            Long sku = sizeToSku.get(size);
            if (sku == null) {
                log.warn("Size {} not found in sku mapping for productId={}", size, item.getProductId());
                continue;
            }
            String availabilityStatus = availabilityMap.get(sku);
            if ("in_stock".equalsIgnoreCase(availabilityStatus)) {
                inStock = true;
                inStockSizes.add(size);
            }
        }

        return new StockCheckResult(inStock, true, inStockSizes);
    }

    private Map<String, Long> loadSizeToSku(WatchItemEntity item) {
        Instant minCachedAt = Instant.now().minus(SKU_CACHE_TTL);
        List<SkuCacheEntity> cached = skuCacheRepository
                .findByProductIdAndCountryPathAndCachedAtAfter(item.getProductId(), item.getCountryPath(), minCachedAt);
        if (!cached.isEmpty()) {
            Map<String, Long> sizeToSku = new HashMap<>();
            for (SkuCacheEntity entry : cached) {
                sizeToSku.put(entry.getSizeName(), entry.getSku());
            }
            return sizeToSku;
        }

        List<ProductDetailsItem> details;
        try {
            details = zaraClient.fetchProductDetails(item.getCountryPath(), item.getProductId()).block();
        } catch (Exception ex) {
            log.warn("Product details request failed for productId={}, error={}", item.getProductId(), ex.getMessage());
            return new HashMap<>();
        }

        SkuMapping mapping = zaraMapper.mapSkuMapping(details, item.getProductId());
        if (mapping.getSizeToSku().isEmpty()) {
            return new HashMap<>();
        }

        skuCacheRepository.deleteByProductIdAndCountryPath(item.getProductId(), item.getCountryPath());
        Instant cachedAt = Instant.now();
        for (Map.Entry<String, Long> entry : mapping.getSizeToSku().entrySet()) {
            SkuCacheEntity entity = new SkuCacheEntity();
            entity.setProductId(item.getProductId());
            entity.setCountryPath(item.getCountryPath());
            entity.setStoreId(item.getStoreId());
            entity.setColorProductId(mapping.getColorProductId());
            entity.setSizeName(entry.getKey());
            entity.setSku(entry.getValue());
            entity.setCachedAt(cachedAt);
            skuCacheRepository.save(entity);
        }

        return mapping.getSizeToSku();
    }

    private String buildNotificationMessage(WatchItemEntity item, Set<String> inStockSizes) {
        String sizesPart = inStockSizes.isEmpty() ? "Any size" : String.join(", ", inStockSizes);
        String url = String.format("https://www.zara.com/%s/-p%d.html?v1=%d", item.getCountryPath(),
                item.getProductId(), item.getProductId());
        return String.format("Zara in stock! ProductId %d (sizes: %s). Country: %s, Store: %d. URL: %s\n" +
                        "If the URL does not work, open Zara and search productId %d.",
                item.getProductId(), sizesPart, item.getCountryPath(), item.getStoreId(), url, item.getProductId());
    }

    public static class StockCheckResult {
        private final boolean inStock;
        private final boolean availabilityChecked;
        private final Set<String> inStockSizes;

        public StockCheckResult(boolean inStock, boolean availabilityChecked, Set<String> inStockSizes) {
            this.inStock = inStock;
            this.availabilityChecked = availabilityChecked;
            this.inStockSizes = inStockSizes;
        }

        public static StockCheckResult notChecked() {
            return new StockCheckResult(false, false, Set.of());
        }

        public boolean isInStock() {
            return inStock;
        }

        public boolean isAvailabilityChecked() {
            return availabilityChecked;
        }

        public Set<String> getInStockSizes() {
            return inStockSizes;
        }
    }
}
