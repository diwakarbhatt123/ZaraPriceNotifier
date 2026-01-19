# Zara Price Notifier (Node.js)

Spring Boot app has been replaced with a Node.js service that uses Puppeteer + stealth to query Zara APIs, stores watch items in SQLite, and sends Telegram notifications when stock changes from out-of-stock to in-stock.

## Requirements
- Node.js 20+
- Playwright browsers installed

## Setup
```bash
npm install
npm run puppeteer:install
```

## Configuration
Set environment variables (or a `.env` file in the project root):

```ini
PORT=8080
DB_PATH=./zara.db

ZARA_POLL_INTERVAL=PT2M
ZARA_COUNTRY_PATH_DEFAULT=uk/en
ZARA_STORE_ID_DEFAULT=10706
ZARA_REQUEST_COOKIE=
ZARA_ACCEPT_LANGUAGE=en-GB,en;q=0.9
ZARA_REFERER_BASE=https://www.zara.com
ZARA_USE_PLAYWRIGHT_FOR_APIS=true
ZARA_PLAYWRIGHT_HEADLESS=true
ZARA_COOKIE_REFRESH_URL=https://www.zara.com/
ZARA_PROXY_SERVER=
ZARA_PROXY_USERNAME=
ZARA_PROXY_PASSWORD=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Notes:
- `ZARA_POLL_INTERVAL` must be ISO-8601 duration (e.g. `PT30S`, `PT2M`).
- This build uses Puppeteer with stealth. Chromium only.
- If Zara blocks Puppeteer, consider `ZARA_PLAYWRIGHT_HEADLESS=false`, or a residential proxy.
- These endpoints are unofficial and may change.

## Run
```bash
npm start
```

## API
### Create watch item
```bash
curl -X POST http://localhost:8080/api/watch \
  -H 'Content-Type: application/json' \
  -d '{"productId":463521186,"storeId":10706,"countryPath":"uk/en","wantedSizes":["M","L"]}'
```

### List watch items
```bash
curl http://localhost:8080/api/watch
```

### Delete watch item
```bash
curl -X DELETE http://localhost:8080/api/watch/1
```

## How it works
- Polls product-details to map size -> SKU (cached 24h in SQLite).
- Polls availability endpoint for SKU availability.
- Only notifies when a watched item transitions from not-in-stock to in-stock.

## Troubleshooting
- Headful mode sometimes works better:
  - `ZARA_PLAYWRIGHT_HEADLESS=false`
- On servers, you may need residential proxies to avoid Akamai blocks.
