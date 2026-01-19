package com.example.zaranotifier.controller;

import java.util.List;

public class WatchItemRequest {
    private Long productId;
    private Long storeId;
    private String countryPath;
    private List<String> wantedSizes;

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
}
