package com.example.zaranotifier.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.example.zaranotifier.config.ZaraProperties;
import com.example.zaranotifier.controller.WatchItemRequest;
import com.example.zaranotifier.entity.WatchItemEntity;
import com.example.zaranotifier.repository.WatchItemRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WatchService {
    private final WatchItemRepository watchItemRepository;
    private final ObjectMapper objectMapper;

    public WatchService(WatchItemRepository watchItemRepository, ObjectMapper objectMapper) {
        this.watchItemRepository = watchItemRepository;
        this.objectMapper = objectMapper;
    }

    public List<WatchItemEntity> findAll() {
        return watchItemRepository.findAll();
    }

    public WatchItemEntity create(WatchItemRequest request, ZaraProperties defaults) {
        WatchItemEntity entity = new WatchItemEntity();
        entity.setProductId(request.getProductId());
        entity.setStoreId(request.getStoreId() != null ? request.getStoreId() : defaults.getStoreIdDefault());
        entity.setCountryPath(normalizeCountryPath(request.getCountryPath() != null ? request.getCountryPath() : defaults.getCountryPathDefault()));
        entity.setWantedSizesJson(writeWantedSizesJson(normalizeSizes(request.getWantedSizes())));
        return watchItemRepository.save(entity);
    }

    public void delete(Long id) {
        watchItemRepository.deleteById(id);
    }

    public WatchItemEntity save(WatchItemEntity entity) {
        return watchItemRepository.save(entity);
    }

    public List<String> readWantedSizes(WatchItemEntity entity) {
        if (entity.getWantedSizesJson() == null || entity.getWantedSizesJson().isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(entity.getWantedSizesJson(), new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    public List<String> normalizeSizes(List<String> sizes) {
        if (sizes == null) {
            return Collections.emptyList();
        }
        List<String> normalized = new ArrayList<>();
        for (String size : sizes) {
            if (size == null) {
                continue;
            }
            String trimmed = size.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed.toUpperCase(Locale.ROOT));
            }
        }
        return normalized;
    }

    public String normalizeCountryPath(String countryPath) {
        if (countryPath == null) {
            return null;
        }
        String trimmed = countryPath.trim();
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String writeWantedSizesJson(List<String> sizes) {
        try {
            return objectMapper.writeValueAsString(sizes);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
