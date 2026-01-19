import express from 'express';
import zaraClient from '../services/zaraClient.js';

const router = express.Router();

router.get('/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query param required' });
  }
  if (!url.startsWith('https://www.zara.com/')) {
    return res.status(400).json({ error: 'only https://www.zara.com/* is allowed' });
  }
  try {
    const result = await zaraClient.fetchDebug(url);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
