import express from 'express';
import config from './config.js';
import watchRoutes from './routes/watchRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/watch', watchRoutes);
app.use('/api/product', productRoutes);
app.use('/api/debug', debugRoutes);

app.listen(config.port, () => {
  console.log(`Zara notifier listening on port ${config.port}`);
});

startScheduler();
