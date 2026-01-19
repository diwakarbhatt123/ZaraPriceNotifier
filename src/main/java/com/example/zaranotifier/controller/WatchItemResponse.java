package com.example.zaranotifier.controller;

import java.time.Instant;
import java.util.List;

public class WatchItemResponse {
    private Long id;
    private Long productId;
    private Long storeId;
    private String countryPath;
    private List<String> wantedSizes;
    private Boolean lastInStock;
    private Instant lastCheckedAt;
    private Instant lastNotifiedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public String getCountryPath() {
        return countryPath;
    }

    public void setCountryPath(String countryPath) {
        this.countryPath = countryPath;
    }

    public List<String> getWantedSizes() {
        return wantedSizes;
    }

    public void setWantedSizes(List<String> wantedSizes) {
        this.wantedSizes = wantedSizes;
    }

    public Boolean getLastInStock() {
        return lastInStock;
    }

    public void setLastInStock(Boolean lastInStock) {
        this.lastInStock = lastInStock;
    }

    public Instant getLastCheckedAt() {
        return lastCheckedAt;
    }

    public void setLastCheckedAt(Instant lastCheckedAt) {
        this.lastCheckedAt = lastCheckedAt;
    }

    public Instant getLastNotifiedAt() {
        return lastNotifiedAt;
    }

    public void setLastNotifiedAt(Instant lastNotifiedAt) {
        this.lastNotifiedAt = lastNotifiedAt;
    }
}
