package com.example.zaranotifier.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.example.zaranotifier.entity.WatchItemEntity;
import com.example.zaranotifier.repository.WatchItemRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

class WatchServiceTest {
    @Test
    void normalizeSizesUppercasesAndTrims() {
        WatchService service = new WatchService(mock(WatchItemRepository.class), new ObjectMapper());
        List<String> result = service.normalizeSizes(Arrays.asList(" s ", "M", "", null, "xl"));
        assertEquals(Arrays.asList("S", "M", "XL"), result);
    }

    @Test
    void normalizeCountryPathTrimsSlashes() {
        WatchService service = new WatchService(mock(WatchItemRepository.class), new ObjectMapper());
        assertEquals("uk/en", service.normalizeCountryPath("/uk/en/"));
    }

    @Test
    void readWantedSizesHandlesJsonRoundTrip() {
        WatchService service = new WatchService(mock(WatchItemRepository.class), new ObjectMapper());
        WatchItemEntity entity = new WatchItemEntity();
        entity.setWantedSizesJson("[\"M\",\"L\"]");
        assertEquals(Arrays.asList("M", "L"), service.readWantedSizes(entity));
    }

    @Test
    void readWantedSizesEmptyOnBlank() {
        WatchService service = new WatchService(mock(WatchItemRepository.class), new ObjectMapper());
        WatchItemEntity entity = new WatchItemEntity();
        entity.setWantedSizesJson("  ");
        assertEquals(Collections.emptyList(), service.readWantedSizes(entity));
    }

    @Test
    void normalizeSizesNullReturnsEmpty() {
        WatchService service = new WatchService(mock(WatchItemRepository.class), new ObjectMapper());
        assertTrue(service.normalizeSizes(null).isEmpty());
    }
}
