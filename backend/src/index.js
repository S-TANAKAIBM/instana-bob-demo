require('@instana/collector')();

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, '../shop.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    stock INTEGER DEFAULT 100,
    image_url TEXT
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER,
    total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const count = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (count.cnt === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, description, price, category, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const products = [
    ['サッカーボール', 'FIFA公認 5号球 試合用ボール', 4800, 'サッカー', 100, 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400'],
    ['サッカースパイク', '軽量カーボンソール 天然芝対応', 12800, 'サッカー', 100, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    ['ユニフォームセット', '吸汗速乾 上下セット 全5色', 6500, 'サッカー', 100, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400'],
    ['シンガード', 'プロ仕様 軽量シンガード', 2200, 'サッカー', 100, 'https://images.unsplash.com/photo-1556906781-9a412961a28b?w=400'],
    ['バスケットボール', 'NBA公認 7号球 屋内外兼用', 5200, 'バスケットボール', 100, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'],
    ['バスケシューズ', 'ハイカット クッション強化モデル', 14800, 'バスケットボール', 100, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    ['ランニングシューズ', '軽量 反発素材 フルマラソン対応', 9800, 'ランニング', 100, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    ['ランニングウェア', '速乾UVカット 長距離対応', 3800, 'ランニング', 100, 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400'],
    ['スイムゴーグル', 'UVカット 曇り止め加工', 1800, 'スイミング', 100, 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400'],
    ['水着', '競泳用 撥水加工 Mサイズ', 4200, 'スイミング', 100, 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400'],
    ['登山リュック', '40L 防水 軽量フレーム', 15800, 'アウトドア', 100, 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400'],
    ['トレッキングポール', 'アルミ製 折りたたみ式 2本セット', 5600, 'アウトドア', 100, 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400'],
  ];
  products.forEach(p => insert.run(...p));
}

app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let products;
  if (category) {
    products = db.prepare('SELECT * FROM products WHERE category = ?').all(category);
  } else {
    products = db.prepare('SELECT * FROM products').all();
  }
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products').all();
  res.json(categories.map(c => c.category));
});

app.post('/api/orders', (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
    return res.status(400).json({ error: 'Invalid product_id or quantity' });
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const total = product.price * quantity;
  const result = db.prepare(
    'INSERT INTO orders (product_id, quantity, total) VALUES (?, ?, ?)'
  ).run(product_id, quantity, total);
  res.json({ id: result.lastInsertRowid, total });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/error-inject', async (req, res) => {
  const { type } = req.body;
  switch (type) {
    case '501':
      return res.status(501).json({ error: 'Not Implemented', type });
    case 'db_timeout':
      await new Promise(resolve => setTimeout(resolve, 8000));
      return res.status(500).json({ error: 'Database connection timeout', type });
    case 'deadlock':
      try {
        db.prepare('BEGIN EXCLUSIVE').run();
        db.prepare('BEGIN EXCLUSIVE').run();
      } catch (e) {
        try { db.prepare('ROLLBACK').run(); } catch (_) {}
        return res.status(500).json({ error: 'Deadlock detected: ' + e.message, type });
      }
      try { db.prepare('ROLLBACK').run(); } catch (_) {}
      return res.status(500).json({ error: 'Deadlock detected', type });
    case 'memory_leak': {
      // Allocate and immediately discard so the memory can be GC'd,
      // avoiding persistent heap growth that crashes the process.
      (() => {
        const leak = [];
        for (let i = 0; i < 1000000; i++) leak.push(new Array(100).fill('leak'));
      })();
      return res.status(500).json({ error: 'Memory leak detected', type });
    }
    case 'slow_query':
      await new Promise(resolve => setTimeout(resolve, 5000));
      return res.json({ message: 'Slow query completed', type });
    case 'cpu_spike': {
      // Use async sleep instead of a busy-loop to avoid blocking the event loop,
      // which was causing all concurrent requests to time out (cascade erroneous calls).
      await new Promise(resolve => setTimeout(resolve, 3000));
      return res.status(500).json({ error: 'CPU spike detected', type });
    }
    case 'external_api_fail':
      try {
        const response = await fetch('https://this-api-does-not-exist-12345.com/api');
        return res.json(await response.json());
      } catch (e) {
        return res.status(503).json({ error: 'External API call failed: ' + e.message, type });
      }
    case 'disk_full':
      return res.status(507).json({ error: 'Insufficient storage', type });
    default:
      return res.status(400).json({ error: 'Unknown error type' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
