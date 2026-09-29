const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const ERROR_TYPES = [
  { id: '501',              label: '501 Not Implemented',     emoji: '🚧' },
  { id: 'db_timeout',       label: 'データベース接続タイムアウト', emoji: '⏱' },
  { id: 'deadlock',         label: 'デッドロック検知',           emoji: '⚔️' },
  { id: 'memory_leak',      label: 'メモリリーク検知',           emoji: '🔥' },
  { id: 'slow_query',       label: 'スロークエリ発生',           emoji: '🐌' },
  { id: 'cpu_spike',        label: 'CPU使用率100%',            emoji: '🌡' },
  { id: 'external_api_fail',label: '外部API呼び出し失敗',       emoji: '🌐' },
  { id: 'disk_full',        label: 'ディスク容量不足',           emoji: '💾' },
];

// エラー発火API
app.post('/trigger', async (req, res) => {
  const { type } = req.body;
  try {
    const response = await fetch(`${BACKEND_URL}/api/error-inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await response.json();
    res.json({ success: true, type, result: data, status: response.status });
  } catch (e) {
    res.json({ success: false, type, error: e.message });
  }
});

// ランダム発火API
app.post('/trigger/random', async (req, res) => {
  const random = ERROR_TYPES[Math.floor(Math.random() * ERROR_TYPES.length)];
  try {
    const response = await fetch(`${BACKEND_URL}/api/error-inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: random.id }),
    });
    const data = await response.json();
    res.json({ success: true, type: random.id, label: random.label, result: data, status: response.status });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Error Roulette running on port ${PORT}`);
});
