package com.example.zaranotifier.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.zaranotifier.entity.WatchItemEntity;

public interface WatchItemRepository extends JpaRepository<WatchItemEntity, Long> {
}
