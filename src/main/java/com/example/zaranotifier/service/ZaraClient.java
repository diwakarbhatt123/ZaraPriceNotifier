package com.example.zaranotifier.service;

import java.time.Duration;
import java.util.List;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.example.zaranotifier.config.ZaraProperties;
import com.example.zaranotifier.domain.dto.AvailabilityResponse;
import com.example.zaranotifier.domain.dto.ProductDetailsItem;

import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

@Service
public class ZaraClient {
    private final WebClient webClient;
    private final ZaraProperties zaraProperties;

    public ZaraClient(WebClient.Builder webClientBuilder, ZaraProperties zaraProperties) {
        this.webClient = webClientBuilder
                .build();
        this.zaraProperties = zaraProperties;
    }

    public Mono<List<ProductDetailsItem>> fetchProductDetails(String countryPath, Long productId) {
        String url = String.format("https://www.zara.com/%s/products-details?productIds=%d&ajax=true", countryPath, productId);
        return webClient.get()
                .uri(url)
                .headers(this::applyCommonHeaders)
                .retrieve()
                .onStatus(this::isRetriableStatus, response -> response.createException().map(RetriableHttpException::new))
                .bodyToMono(new ParameterizedTypeReference<List<ProductDetailsItem>>() {})
                .retryWhen(retrySpec());
    }

    public Mono<AvailabilityResponse> fetchAvailability(Long storeId, Long productId) {
        String url = String.format("https://www.zara.com/itxrest/1/catalog/store/%d/product/id/%d/availability", storeId, productId);
        return webClient.get()
                .uri(url)
                .headers(this::applyCommonHeaders)
                .retrieve()
                .onStatus(this::isRetriableStatus, response -> response.createException().map(RetriableHttpException::new))
                .bodyToMono(AvailabilityResponse.class)
                .retryWhen(retrySpec());
    }

    private void applyCommonHeaders(HttpHeaders headers) {
        headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
        headers.set(HttpHeaders.ACCEPT, "application/json, text/plain, */*");
        if (StringUtils.hasText(zaraProperties.getAcceptLanguage())) {
            headers.set(HttpHeaders.ACCEPT_LANGUAGE, zaraProperties.getAcceptLanguage());
        }
        if (StringUtils.hasText(zaraProperties.getRefererBase())) {
            headers.set(HttpHeaders.REFERER, zaraProperties.getRefererBase());
        }
        if (StringUtils.hasText(zaraProperties.getRequestCookie())) {
            headers.set(HttpHeaders.COOKIE, zaraProperties.getRequestCookie());
        }
    }

    private boolean isRetriableStatus(HttpStatusCode status) {
        return status != null && (status.value() == HttpStatus.TOO_MANY_REQUESTS.value() || status.is5xxServerError());
    }

    private Retry retrySpec() {
        return Retry.backoff(3, Duration.ofSeconds(1))
                .maxBackoff(Duration.ofSeconds(6))
                .jitter(0.3)
                .filter(this::isRetriableError)
                .onRetryExhaustedThrow((spec, signal) -> signal.failure());
    }

    private boolean isRetriableError(Throwable throwable) {
        if (throwable instanceof RetriableHttpException) {
            return true;
        }
        if (throwable instanceof WebClientResponseException ex) {
            return isRetriableStatus(HttpStatus.valueOf(ex.getStatusCode().value()));
        }
        return false;
    }

    public static class RetriableHttpException extends RuntimeException {
        public RetriableHttpException(Throwable cause) {
            super(cause);
        }
    }
}
