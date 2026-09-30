# Pull Request: fix/deadlock-response-leak-and-transaction-rollback

## タイトル
fix: deadlockケースのレスポンス未送信とトランザクションリークを修正

## ブランチ
- Base: `main`
- Head: `fix/deadlock-response-leak-and-transaction-rollback`

## 対応アラート
- **アラートタイトル**: Unknown Alert（Instana Webhook空ペイロード）/ エラーのある呼び出し率が通常より高い
- **対象アプリ**: instana-bob-demo
- **重大度**: Warning (5)
- **受信時刻**: 2026-09-30T03:39:59.970Z
- **メトリクス**: erroneousCalls = 1.000 >= 1.000

## 根本原因

`backend/src/index.js` の `/api/error-inject` エンドポイント `deadlock` ケースに2つのバグが存在していた。

### バグ1: レスポンス未送信（HTTPハング）

```js
// 修正前
case 'deadlock':
  try {
    db.prepare('BEGIN EXCLUSIVE').run();
    db.prepare('BEGIN EXCLUSIVE').run();
  } catch (e) {
    return res.status(500).json({ error: 'Deadlock detected: ' + e.message, type });
  }
  break;  // ← tryが成功した場合、ここでswitch文を抜けてレスポンス未送信でハング
```

`try` ブロック内の例外が発生しない（1回目の `BEGIN EXCLUSIVE` 成功後に何らかの理由で2回目が成功してしまう）ケース、またはトランザクションが既に開いている状態では、`break` でswitch文を抜けた後にHTTPレスポンスが返されず、リクエストがハングする。Instanaはこの未応答リクエストを **erroneousCalls** として検知しアラートを発火した。

### バグ2: DBトランザクションリーク

`BEGIN EXCLUSIVE` トランザクションが `ROLLBACK` されずに残存するため、後続の `/api/orders` 等のDB書き込み操作がブロックされるリスクがあった。

## 修正内容

```js
// 修正後
case 'deadlock':
  try {
    db.prepare('BEGIN EXCLUSIVE').run();
    db.prepare('BEGIN EXCLUSIVE').run();
  } catch (e) {
    try { db.prepare('ROLLBACK').run(); } catch (_) {}  // トランザクション解放
    return res.status(500).json({ error: 'Deadlock detected: ' + e.message, type });
  }
  try { db.prepare('ROLLBACK').run(); } catch (_) {}  // 正常パスでもROLLBACK
  return res.status(500).json({ error: 'Deadlock detected', type });  // 必ずレスポンスを返す
```

- `break` を削除し、すべてのコードパスで必ず `res.json()` を呼ぶように修正
- `catch` 節と正常終了パスの両方で `ROLLBACK` を実行し、トランザクションを確実に解放
- エラーレスポンス(500)を返すことでInstanaが正しくエラーとして記録できるようにした

## 変更ファイル
- `backend/src/index.js`: +3行, -1行

## テスト方法
```bash
curl -s -X POST http://localhost:8000/api/error-inject \
  -H "Content-Type: application/json" \
  -d '{"type":"deadlock"}' | python3 -m json.tool
# 期待結果: {"error": "Deadlock detected...", "type": "deadlock"} が即座に返る
```
