package com.example.zaranotifier.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "watch_items")
public class WatchItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Long storeId;

    @Column(nullable = false)
    private String countryPath;

    @Column(columnDefinition = "TEXT")
    private String wantedSizesJson;

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

    public String getWantedSizesJson() {
        return wantedSizesJson;
    }

    public void setWantedSizesJson(String wantedSizesJson) {
        this.wantedSizesJson = wantedSizesJson;
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
