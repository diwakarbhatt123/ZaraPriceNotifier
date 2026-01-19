package com.example.zaranotifier.notifier;

import com.example.zaranotifier.entity.WatchItemEntity;

public interface Notifier {
    void notifyInStock(WatchItemEntity item, String message);
}
