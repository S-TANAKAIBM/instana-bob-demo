# Instana × IBM Bob 障害自動対応デモ

IBM Instana でエラーを検知し、IBM Bob が原因分析から GitHub PR 作成までを自律的に実行するデモ環境です。

## 構成

- backend/         Express.js バックエンドAPI (port 8000)
- frontend/        Next.js フロントエンド (port 3000)
- error-roulette/  エラー発火ツール (port 8001)

## 技術スタック

- フロントエンド: Next.js + Tailwind CSS
- バックエンド: Node.js + Express
- DB: SQLite (better-sqlite3)
- 監視: IBM Instana (@instana/collector)
- プロセス管理: PM2
- ホスティング: AWS EC2 (t3.small)

## セットアップ

1. リポジトリをクローン
   git clone https://github.com/S-TANAKAIBM/instana-bob-demo.git
   cd instana-bob-demo

2. 各ディレクトリで npm install を実行
   cd backend && npm install
   cd ../frontend && npm install
   cd ../error-roulette && npm install

3. 環境変数を設定
   frontend/.env.local に NEXT_PUBLIC_API_URL=http://<サーバーIP>:8000

4. 起動
   pm2 start backend/src/index.js --name backend
   pm2 start error-roulette/src/index.js --name error-roulette
   cd frontend && npm run build && pm2 start npm --name frontend -- start

## アクセス先

- オンラインショップ:  http://<サーバーIP>:3000
- エラー発火ツール:    http://<サーバーIP>:8001
- バックエンドAPI:     http://<サーバーIP>:8000

## エラー発火ツールの種類

- HTTP Error:     501 Not Implemented
- Infrastructure: メモリリーク / CPU使用率100% / ディスク容量不足
- Database:       DBタイムアウト / デッドロック検知
- Performance:    スロークエリ
- Dependency:     外部API呼び出し失敗

## デモシナリオ

1. エラー発火ツールでエラーを発火
2. IBM Instana がリアルタイムでエラーを検知・アラート発火
3. IBM Bob がアラートを受け取り、ログ・メトリクス・コードを分析
4. Bob が原因コードを特定し、修正コードを生成
5. GitHub に Issue + PR を自動作成
6. エンジニアはスマホで PR をレビュー・承認するだけ

## 注意事項

- .pem ファイルは絶対に Git にコミットしないでください
- frontend/.env.local は .gitignore に含まれています
- デモ用途のため、本番環境での使用は想定していません

## 参考

- IBM Instana Observability: https://www.ibm.com/products/instana
- IBM Bob: https://www.ibm.com/products/ibm-bob
