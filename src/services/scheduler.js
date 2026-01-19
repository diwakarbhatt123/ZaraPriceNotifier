import { listWatchItems } from './watchService.js';
import { checkStockForItem } from './stockService.js';
import config from '../config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const startScheduler = () => {
  const run = async () => {
    const items = listWatchItems();
    for (const item of items) {
      const jitter = Math.floor(Math.random() * 10000);
      if (jitter > 0) {
        await sleep(jitter);
      }
      try {
        await checkStockForItem(item);
      } catch (err) {
        console.warn(`Poll failed for productId=${item.product_id}: ${err.message}`);
      }
    }
  };

  run();
  setInterval(run, config.zara.pollIntervalMs);
};
