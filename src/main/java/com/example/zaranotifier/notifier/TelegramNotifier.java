package com.example.zaranotifier.notifier;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.example.zaranotifier.config.TelegramProperties;
import com.example.zaranotifier.entity.WatchItemEntity;

@Component
public class TelegramNotifier implements Notifier {
    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);

    private final TelegramProperties properties;
    private final WebClient webClient;

    public TelegramNotifier(TelegramProperties properties, WebClient.Builder webClientBuilder) {
        this.properties = properties;
        this.webClient = webClientBuilder.build();
    }

    @Override
    public void notifyInStock(WatchItemEntity item, String message) {
        if (properties.getBotToken() == null || properties.getBotToken().isBlank()
                || properties.getChatId() == null || properties.getChatId().isBlank()) {
            log.warn("Telegram bot token/chat id not configured. Skipping notification.");
            return;
        }

        String url = String.format("https://api.telegram.org/bot%s/sendMessage", properties.getBotToken());
        Map<String, Object> payload = new HashMap<>();
        payload.put("chat_id", properties.getChatId());
        payload.put("text", message);
        payload.put("disable_web_page_preview", true);

        try {
            webClient.post()
                    .uri(url)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception ex) {
            log.warn("Failed to send Telegram notification for productId={}, error={}", item.getProductId(), ex.getMessage());
        }
    }
}
