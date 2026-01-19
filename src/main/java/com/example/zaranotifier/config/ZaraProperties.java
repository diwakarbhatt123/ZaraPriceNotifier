package com.example.zaranotifier.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zara")
public class ZaraProperties {
    private Duration pollInterval = Duration.ofMinutes(2);
    private String countryPathDefault = "uk/en";
    private Long storeIdDefault = 10706L;
    private String requestCookie;
    private String acceptLanguage = "en-GB,en;q=0.9";
    private String refererBase = "https://www.zara.com";

    public Duration getPollInterval() {
        return pollInterval;
    }

    public void setPollInterval(Duration pollInterval) {
        this.pollInterval = pollInterval;
    }

    public String getCountryPathDefault() {
        return countryPathDefault;
    }

    public void setCountryPathDefault(String countryPathDefault) {
        this.countryPathDefault = countryPathDefault;
    }

    public Long getStoreIdDefault() {
        return storeIdDefault;
    }

    public void setStoreIdDefault(Long storeIdDefault) {
        this.storeIdDefault = storeIdDefault;
    }

    public String getRequestCookie() {
        return requestCookie;
    }

    public void setRequestCookie(String requestCookie) {
        this.requestCookie = requestCookie;
    }

    public String getAcceptLanguage() {
        return acceptLanguage;
    }

    public void setAcceptLanguage(String acceptLanguage) {
        this.acceptLanguage = acceptLanguage;
    }

    public String getRefererBase() {
        return refererBase;
    }

    public void setRefererBase(String refererBase) {
        this.refererBase = refererBase;
    }
}
