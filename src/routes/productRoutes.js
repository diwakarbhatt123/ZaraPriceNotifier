import express from 'express';
import zaraClient from '../services/zaraClient.js';
import config from '../config.js';

const router = express.Router();

const extractProductName = (details) => {
  if (!Array.isArray(details) || details.length === 0) return null;
  const item = details[0];
  return (
    item?.name ||
    item?.detail?.name ||
    item?.detail?.commercialName ||
    item?.detail?.longName ||
    item?.product?.name ||
    null
  );
};

router.get('/name', async (req, res) => {
  const { productId, countryPath } = req.query || {};
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  try {
    const details = await zaraClient.fetchProductDetails(
      countryPath || config.zara.countryPathDefault,
      productId
    );
    const name = extractProductName(details);
    return res.json({ productId: Number(productId), name });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Failed to fetch product name' });
  }
});

export default router;
