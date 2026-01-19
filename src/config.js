import dotenv from 'dotenv';
import { Duration } from 'luxon';

dotenv.config();

const toDurationMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  try {
    const duration = Duration.fromISO(value);
    return duration.isValid ? duration.as('milliseconds') : fallbackMs;
  } catch {
    return fallbackMs;
  }
};

const config = {
  port: Number(process.env.PORT || 8080),
  env: process.env.NODE_ENV || 'production',
  zara: {
    pollIntervalMs: toDurationMs(process.env.ZARA_POLL_INTERVAL || 'PT2M', 2 * 60 * 1000),
    countryPathDefault: process.env.ZARA_COUNTRY_PATH_DEFAULT || 'uk/en',
    storeIdDefault: Number(process.env.ZARA_STORE_ID_DEFAULT || 10706),
    requestCookie: process.env.ZARA_REQUEST_COOKIE || '',
    acceptLanguage: process.env.ZARA_ACCEPT_LANGUAGE || 'en-GB,en;q=0.9',
    refererBase: process.env.ZARA_REFERER_BASE || 'https://www.zara.com',
    usePlaywrightForApis: (process.env.ZARA_USE_PLAYWRIGHT_FOR_APIS || 'true') === 'true',
    playwrightBrowser: process.env.ZARA_PLAYWRIGHT_BROWSER || 'chromium',
    headless: (process.env.ZARA_PLAYWRIGHT_HEADLESS || 'true') === 'true',
    cookieRefreshUrl: process.env.ZARA_COOKIE_REFRESH_URL || 'https://www.zara.com/'
    ,
    proxyServer: process.env.ZARA_PROXY_SERVER || '',
    proxyUsername: process.env.ZARA_PROXY_USERNAME || '',
    proxyPassword: process.env.ZARA_PROXY_PASSWORD || ''
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || ''
  },
  dbPath: process.env.DB_PATH || './zara.db'
};

export default config;
