import express from 'express';
import { createWatchItem, deleteWatchItem, listWatchItems } from '../services/watchService.js';
import config from '../config.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listWatchItems());
});

router.post('/', (req, res) => {
  const { productId, storeId, countryPath, wantedSizes } = req.body || {};
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }
  const item = createWatchItem({
    productId: Number(productId),
    storeId: storeId ? Number(storeId) : undefined,
    countryPath,
    wantedSizes
  }, config.zara);
  return res.status(201).json(item);
});

router.delete('/:id', (req, res) => {
  const ok = deleteWatchItem(Number(req.params.id));
  if (!ok) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(204).send();
});

export default router;
