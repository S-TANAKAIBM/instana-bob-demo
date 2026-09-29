'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CATEGORIES = ['サッカー', 'バスケットボール', 'ランニング', 'スイミング', 'アウトドア'];
const CATEGORY_EMOJI: Record<string, string> = {
  'サッカー': '⚽',
  'バスケットボール': '🏀',
  'ランニング': '🏃',
  'スイミング': '🏊',
  'アウトドア': '🏕️',
};

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(r => r.json())
      .then(data => {
        setFeatured(data.slice(0, 4));
        setProducts(data);
      });
  }, []);

  useEffect(() => {
    const url = selectedCategory
      ? `${API}/api/products?category=${encodeURIComponent(selectedCategory)}`
      : `${API}/api/products`;
    fetch(url).then(r => r.json()).then(setProducts);
  }, [selectedCategory]);

  const addToCart = (product: any) => {
    fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    });
    alert(`「${product.name}」をカートに追加しました`);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ヘッダー */}
      <header style={{ background: '#161616', color: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl tracking-tight">⚽ SPORT ZONE</span>
            <nav className="hidden md:flex gap-6 text-sm text-gray-300">
              <a href="#" className="hover:text-white">サッカー</a>
              <a href="#" className="hover:text-white">バスケットボール</a>
              <a href="#" className="hover:text-white">ランニング</a>
              <a href="#" className="hover:text-white">スイミング</a>
              <a href="#" className="hover:text-white">アウトドア</a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-gray-300 text-sm">
            <span className="cursor-pointer hover:text-white">🔍</span>
            <span className="cursor-pointer hover:text-white">🛒</span>
            <span className="cursor-pointer hover:text-white">👤</span>
          </div>
        </div>
      </header>

      {/* お知らせバー */}
      <div style={{ background: '#e8f3ff', borderBottom: '1px solid #d0e2ff' }}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
          <span style={{ color: '#0043ce' }}>秋の新作スポーツウェア入荷中 — 全品送料無料キャンペーン実施中</span>
          <a href="#" style={{ color: '#0f62fe' }} className="flex items-center gap-1 hover:underline">詳細はこちら →</a>
        </div>
      </div>

      {/* ヒーロー */}
      <div style={{ background: '#f4f4f4' }} className="py-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 gap-8 items-center">
          <div className="col-span-2">
            <p className="text-sm mb-3" style={{ color: '#0f62fe' }}>2026年 秋冬コレクション</p>
            <h1 className="text-5xl font-light mb-6 leading-tight" style={{ color: '#161616' }}>
              本格スポーツ用品、<br />ここに集結
            </h1>
            <p className="text-lg mb-8" style={{ color: '#525252' }}>
              プロ仕様からビギナー向けまで、<br />あなたのスポーツライフを全力サポート。
            </p>
            <button
              style={{ background: '#0f62fe', color: 'white', padding: '14px 32px', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              className="hover:opacity-90 transition-opacity"
            >
              商品を見る →
            </button>
          </div>
          <div style={{ background: '#e0e0e0', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '80px' }}>⚽</span>
          </div>
        </div>
      </div>

      {/* カテゴリ */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-light mb-6" style={{ color: '#161616' }}>カテゴリから探す</h2>
        <div className="grid grid-cols-5 gap-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
              style={{
                border: selectedCategory === cat ? '2px solid #0f62fe' : '1px solid #e0e0e0',
                background: selectedCategory === cat ? '#e8f3ff' : 'white',
                color: selectedCategory === cat ? '#0043ce' : '#161616',
                padding: '20px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{CATEGORY_EMOJI[cat]}</div>
              <div style={{ fontSize: '13px', fontWeight: selectedCategory === cat ? 600 : 400 }}>{cat}</div>
            </button>
          ))}
        </div>
      </div>

      {/* おすすめ商品 */}
      {!selectedCategory && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light" style={{ color: '#161616' }}>おすすめ商品</h2>
            <a href="#" style={{ color: '#0f62fe', fontSize: '14px' }} className="hover:underline">すべて見る →</a>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {featured.map((p: any) => (
              <ProductCard key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {selectedCategory && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light" style={{ color: '#161616' }}>
              {CATEGORY_EMOJI[selectedCategory]} {selectedCategory}
            </h2>
            <button onClick={() => setSelectedCategory('')} style={{ color: '#0f62fe', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← すべて表示
            </button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-4">
          {(selectedCategory ? products : products.slice(4)).map((p: any) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} />
          ))}
        </div>
      </div>

      {/* フッター */}
      <footer style={{ background: '#161616', color: '#c6c6c6' }} className="py-8">
        <div className="max-w-7xl mx-auto px-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">⚽ SPORT ZONE</span>
            <span>© 2026 SPORT ZONE. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: any; onAdd: (p: any) => void }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', background: 'white', transition: 'box-shadow 0.15s' }}
      className="hover:shadow-lg">
      <img
        src={product.image_url}
        alt={product.name}
        style={{ width: '100%', height: '200px', objectFit: 'cover', background: '#f4f4f4' }}
      />
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: '11px', color: '#6f6f6f', marginBottom: '4px' }}>{product.category}</p>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#161616', marginBottom: '6px' }}>{product.name}</h3>
        <p style={{ fontSize: '12px', color: '#525252', marginBottom: '12px', lineHeight: 1.4 }}>{product.description}</p>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '18px', fontWeight: 300, color: '#161616' }}>¥{product.price.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: '#198038' }}>在庫あり</span>
        </div>
        <button
          onClick={() => onAdd(product)}
          style={{
            width: '100%',
            background: '#0f62fe',
            color: 'white',
            border: 'none',
            padding: '10px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          className="hover:opacity-90 transition-opacity"
        >
          カートに追加
        </button>
      </div>
    </div>
  );
}
