package com.example.zaranotifier.scheduler;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.zaranotifier.entity.WatchItemEntity;
import com.example.zaranotifier.service.StockService;
import com.example.zaranotifier.service.WatchService;

@Component
public class PollScheduler {
    private static final Logger log = LoggerFactory.getLogger(PollScheduler.class);

    private final WatchService watchService;
    private final StockService stockService;

    public PollScheduler(WatchService watchService, StockService stockService) {
        this.watchService = watchService;
        this.stockService = stockService;
    }

    @Scheduled(fixedDelayString = "${zara.poll-interval}")
    public void poll() {
        List<WatchItemEntity> items = watchService.findAll();
        if (items.isEmpty()) {
            return;
        }

        for (WatchItemEntity item : items) {
            sleepJitter();
            try {
                stockService.evaluateAndNotify(item);
            } catch (Exception ex) {
                log.warn("Polling failed for productId={}, error={}", item.getProductId(), ex.getMessage());
            }
        }
    }

    private void sleepJitter() {
        int millis = ThreadLocalRandom.current().nextInt(0, 10_001);
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
