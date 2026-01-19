import Database from 'better-sqlite3';
import config from './config.js';

const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS watch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  country_path TEXT NOT NULL,
  wanted_sizes_json TEXT,
  last_in_stock INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  last_notified_at TEXT
);

CREATE TABLE IF NOT EXISTS sku_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  country_path TEXT NOT NULL,
  store_id INTEGER,
  color_product_id INTEGER,
  size_name TEXT NOT NULL,
  sku INTEGER NOT NULL,
  cached_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sku_cache_product ON sku_cache(product_id, country_path);
`);

export default db;
