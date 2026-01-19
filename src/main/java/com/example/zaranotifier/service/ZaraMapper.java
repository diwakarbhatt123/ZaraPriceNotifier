package com.example.zaranotifier.service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.example.zaranotifier.domain.dto.ProductDetailsItem;

@Component
public class ZaraMapper {
    public SkuMapping mapSkuMapping(List<ProductDetailsItem> items, Long productId) {
        if (items == null || items.isEmpty()) {
            return new SkuMapping(Collections.emptyMap(), null);
        }
        ProductDetailsItem item = items.get(0);
        if (item.getDetail() == null || item.getDetail().getColors() == null || item.getDetail().getColors().isEmpty()) {
            return new SkuMapping(Collections.emptyMap(), null);
        }

        ProductDetailsItem.Color selected = null;
        for (ProductDetailsItem.Color color : item.getDetail().getColors()) {
            if (color != null && color.getProductId() != null && color.getProductId().equals(productId)) {
                selected = color;
                break;
            }
        }
        if (selected == null) {
            selected = item.getDetail().getColors().get(0);
        }

        Map<String, Long> sizeToSku = new HashMap<>();
        if (selected.getSizes() != null) {
            for (ProductDetailsItem.Size size : selected.getSizes()) {
                if (size == null || size.getName() == null || size.getSku() == null) {
                    continue;
                }
                String sizeName = size.getName().trim().toUpperCase(Locale.ROOT);
                if (!sizeName.isEmpty()) {
                    sizeToSku.put(sizeName, size.getSku());
                }
            }
        }

        return new SkuMapping(sizeToSku, selected.getProductId());
    }

    public static class SkuMapping {
        private final Map<String, Long> sizeToSku;
        private final Long colorProductId;

        public SkuMapping(Map<String, Long> sizeToSku, Long colorProductId) {
            this.sizeToSku = sizeToSku;
            this.colorProductId = colorProductId;
        }

        public Map<String, Long> getSizeToSku() {
            return sizeToSku;
        }

        public Long getColorProductId() {
            return colorProductId;
        }
    }
}
