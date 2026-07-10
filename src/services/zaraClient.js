import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { DateTime } from 'luxon';
import config from '../config.js';
import { parse as parseCookie } from 'cookie';

puppeteer.use(stealthPlugin());

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const nowUtc = () => DateTime.utc();

class ZaraClient {
  constructor() {
    this.cookieJar = new Map();
    this.browser = null;
    this.page = null;
    this.lastWarmAt = null;
    this.seedCookies(config.zara.requestCookie);
  }

  seedCookies(rawCookieHeader) {
    if (!rawCookieHeader) return;
    const parsed = parseCookie(rawCookieHeader);
    Object.entries(parsed).forEach(([key, value]) => {
      this.cookieJar.set(key, value);
    });
  }

  buildCookieHeader() {
    if (!this.cookieJar.size) return '';
    return Array.from(this.cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async ensurePage() {
    if (this.page) return;
    const args = [];
    if(process.platform === 'linux') {
      args.push('--no-sandbox', '--disable-setuid-sandbox')
    }
    if (config.zara.proxyServer) {
      args.push(`--proxy-server=${config.zara.proxyServer}`);
    }
    this.browser = await puppeteer.launch({
      headless: config.zara.headless ? 'new' : false,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(UA);
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': config.zara.acceptLanguage
    });
    if (config.zara.proxyUsername && config.zara.proxyPassword) {
      await this.page.authenticate({
        username: config.zara.proxyUsername,
        password: config.zara.proxyPassword
      });
    }
    await this.seedPageCookies();
  }

  async seedPageCookies() {
    if (!this.page || !this.cookieJar.size) return;
    const cookies = Array.from(this.cookieJar.entries()).map(([name, value]) => ({
      name,
      value,
      domain: '.zara.com',
      path: '/'
    }));
    await this.page.setCookie(...cookies);
  }

  async syncCookiesFromPage() {
    if (!this.page) return;
    const cookies = await this.page.cookies();
    for (const cookie of cookies) {
      if (cookie.name && cookie.value) {
        this.cookieJar.set(cookie.name, cookie.value);
      }
    }
  }

  async warmIfNeeded() {
    const now = nowUtc();
    if (this.lastWarmAt && this.lastWarmAt.plus({ minutes: 10 }) > now) return;
    await this.page.goto(config.zara.cookieRefreshUrl, { waitUntil: 'domcontentloaded' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await this.syncCookiesFromPage();
    this.lastWarmAt = now;
  }

  async fetchJson(url) {
    await this.ensurePage();
    await this.seedPageCookies();
    await this.warmIfNeeded();

    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': config.zara.acceptLanguage,
      'Referer': config.zara.refererBase,
      'User-Agent': UA
    };

    const result = await this.page.evaluate(async (targetUrl, headerMap) => {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: headerMap,
        credentials: 'include'
      });
      const body = await response.text();
      const headersObj = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      return {
        status: response.status,
        headers: headersObj,
        body
      };
    }, url, headers);

    await this.syncCookiesFromPage();

    const contentType = result.headers['content-type'] || 'unknown';
    const trimmed = result.body ? result.body.replace(/\s+/g, ' ').trim() : '';
    const snippet = trimmed.length > 500 ? trimmed.slice(0, 500) + '...' : trimmed;
    console.log(`[zara] request url=${url} headers=${JSON.stringify(headers)}`);
    console.log(`[zara] response url=${url} status=${result.status} contentType=${contentType} bodyLength=${result.body ? result.body.length : 0} headers=${JSON.stringify(result.headers)} snippet=${snippet}`);

    if (result.status === 403) {
      console.error(`[zara] received 403 for ${url}; exiting so systemd can restart the service`);
      process.exit(1);
    }

    if (result.status >= 400) {
      throw new Error(`HTTP ${result.status} from ${url}, body=${result.body.slice(0, 200)}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error(`Unexpected content-type ${contentType} from ${url}, body=${result.body.slice(0, 200)}`);
    }

    return JSON.parse(result.body);
  }

  async fetchProductDetails(countryPath, productId) {
    const url = `https://www.zara.com/${countryPath}/products-details?productIds=${productId}&ajax=true`;
    return this.fetchJson(url);
  }

  async fetchAvailability(storeId, productId) {
    const url = `https://www.zara.com/itxrest/1/catalog/store/${storeId}/product/id/${productId}/availability`;
    return this.fetchJson(url);
  }

  async fetchStoreLocator(countryPath, lat, lng, radius) {
    const url = `https://www.zara.com/${countryPath}/stores-locator/extended/search?lat=${lat}&lng=${lng}&isDonationOnly=false&showOnlyPickup=false&showStoresCapacity=true&radius=${radius}&ajax=true`;
    return this.fetchJson(url);
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    this.page = null;
    this.browser = null;
  }
}

export default new ZaraClient();
