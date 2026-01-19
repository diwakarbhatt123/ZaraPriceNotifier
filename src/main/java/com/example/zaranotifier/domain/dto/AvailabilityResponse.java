package com.example.zaranotifier.domain.dto;

import java.util.List;

public class AvailabilityResponse {
    private List<SkuAvailability> skusAvailability;

    public List<SkuAvailability> getSkusAvailability() {
        return skusAvailability;
    }

    public void setSkusAvailability(List<SkuAvailability> skusAvailability) {
        this.skusAvailability = skusAvailability;
    }

    public static class SkuAvailability {
        private Long sku;
        private String availability;

        public Long getSku() {
            return sku;
        }

        public void setSku(Long sku) {
            this.sku = sku;
        }

        public String getAvailability() {
            return availability;
        }

        public void setAvailability(String availability) {
            this.availability = availability;
        }
    }
}
