package com.example.zaranotifier.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.zaranotifier.config.ZaraProperties;
import com.example.zaranotifier.entity.WatchItemEntity;
import com.example.zaranotifier.service.WatchService;

@RestController
@RequestMapping("/api/watch")
public class WatchItemController {
    private final WatchService watchService;
    private final ZaraProperties zaraProperties;

    public WatchItemController(WatchService watchService, ZaraProperties zaraProperties) {
        this.watchService = watchService;
        this.zaraProperties = zaraProperties;
    }

    @PostMapping
    public ResponseEntity<WatchItemResponse> create(@RequestBody WatchItemRequest request) {
        if (request.getProductId() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        WatchItemEntity saved = watchService.create(request, zaraProperties);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @GetMapping
    public List<WatchItemResponse> list() {
        return watchService.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        watchService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private WatchItemResponse toResponse(WatchItemEntity entity) {
        WatchItemResponse response = new WatchItemResponse();
        response.setId(entity.getId());
        response.setProductId(entity.getProductId());
        response.setStoreId(entity.getStoreId());
        response.setCountryPath(entity.getCountryPath());
        response.setWantedSizes(watchService.readWantedSizes(entity));
        response.setLastInStock(entity.getLastInStock());
        response.setLastCheckedAt(entity.getLastCheckedAt());
        response.setLastNotifiedAt(entity.getLastNotifiedAt());
        return response;
    }
}
