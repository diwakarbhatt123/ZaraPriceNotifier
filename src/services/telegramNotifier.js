import config from '../config.js';

export const sendTelegram = async ({ productId, countryPath, wantedSizes, storeSummary }) => {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    console.warn('Telegram not configured; skipping notification.');
    return;
  }

  const sizeText = wantedSizes.length ? wantedSizes.join(', ') : 'Any size';
  const url = `https://www.zara.com/${countryPath}/-p.html?v1=${productId}`;
  const storeText = storeSummary ? `\nStore availability:\n${storeSummary}` : '';
  const message = `Zara in stock!\nProduct: ${productId}\nSizes: ${sizeText}\nOpen: ${url}\nIf URL fails, search productId ${productId} on Zara.${storeText}`;

  const apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text: message })
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn(`Telegram send failed: ${res.status} ${body}`);
  }
};
