package com.example.zaranotifier.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.zaranotifier.entity.SkuCacheEntity;

public interface SkuCacheRepository extends JpaRepository<SkuCacheEntity, Long> {
    List<SkuCacheEntity> findByProductIdAndCountryPathAndCachedAtAfter(Long productId, String countryPath, Instant cachedAt);

    void deleteByProductIdAndCountryPath(Long productId, String countryPath);
}
