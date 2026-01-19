# Zara Stock Notifier (Spring Boot)

Small Spring Boot app (Java 17) that watches Zara products and sends Telegram alerts when a chosen size becomes in-stock.

## Requirements
- Java 17
- Gradle (or use the Gradle wrapper if you add it)

## Run
```bash
gradle bootRun
```

The app uses SQLite in the project directory (`zara.db`) and starts polling on the configured interval.

## Configuration
Edit `src/main/resources/application.yml`:
- `zara.poll-interval`: ISO-8601 duration (default `PT2M`)
- `zara.country-path-default`: e.g. `uk/en`
- `zara.store-id-default`: e.g. `10706`
- `zara.request-cookie`: optional cookie string if Zara blocks requests (avoid committing real cookies)
- `zara.accept-language`: optional Accept-Language header
- `zara.referer-base`: optional Referer base URL
- `telegram.bot-token`: Telegram bot token
- `telegram.chat-id`: Telegram chat id

## API
Create a watch item:
```bash
curl -X POST http://localhost:8080/api/watch \
  -H 'Content-Type: application/json' \
  -d '{"productId":463521186,"wantedSizes":["M","L"]}'
```

List watch items:
```bash
curl http://localhost:8080/api/watch
```

Delete a watch item:
```bash
curl -X DELETE http://localhost:8080/api/watch/1
```

## Notes
- Product details and availability endpoints are unofficial and may change.
- Availability is authoritative; a product-details response alone will never trigger a notification.
- Zara may return 403 without browser-like headers or cookies. You can set `zara.request-cookie` in config for local runs.
