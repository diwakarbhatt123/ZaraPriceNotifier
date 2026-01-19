package com.example.zaranotifier.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;

import com.example.zaranotifier.repository.WatchItemRepository;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:sqlite:./build/test-zara.db",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.task.scheduling.enabled=false",
                "zara.country-path-default=uk/en",
                "zara.store-id-default=10706"
        }
)
class WatchItemControllerIT {
    private WebTestClient webTestClient;

    @Autowired
    private WatchItemRepository watchItemRepository;

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUpClient() {
        this.webTestClient = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build();
    }

    @AfterEach
    void cleanup() {
        watchItemRepository.deleteAll();
    }

    @Test
    void createListDeleteWatchItem() {
        Map<String, Object> request = Map.of(
                "productId", 463521186L,
                "wantedSizes", List.of("m", "L")
        );

        WatchItemResponse created = webTestClient.post()
                .uri("/api/watch")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody(WatchItemResponse.class)
                .returnResult()
                .getResponseBody();

        assertThat(created).isNotNull();
        assertThat(created.getId()).isNotNull();
        assertThat(created.getProductId()).isEqualTo(463521186L);
        assertThat(created.getStoreId()).isEqualTo(10706L);
        assertThat(created.getCountryPath()).isEqualTo("uk/en");
        assertThat(created.getWantedSizes()).containsExactly("M", "L");

        List<WatchItemResponse> list = webTestClient.get()
                .uri("/api/watch")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(WatchItemResponse.class)
                .returnResult()
                .getResponseBody();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(created.getId());

        webTestClient.delete()
                .uri("/api/watch/{id}", created.getId())
                .exchange()
                .expectStatus().isNoContent();

        List<WatchItemResponse> afterDelete = webTestClient.get()
                .uri("/api/watch")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(WatchItemResponse.class)
                .returnResult()
                .getResponseBody();

        assertThat(afterDelete).isEmpty();
    }
}
