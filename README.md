# Instana × IBM Bob 障害自動対応デモ

IBM Instana でエラーを検知し、IBM Bob が原因分析から GitHub PR 作成までを自律的に実行するデモ環境です。

## 構成

| ディレクトリ | 役割 | ポート |
|-------------|------|--------|
| ackend/ | Express.js バックエンドAPI | 8000 |
| rontend/ | Next.js オンラインショップ | 3000 |
| error-roulette/ | エラー発火ツール | 8001 |
| ob-webhook/ | Instana アラート受信 → Bob 起動 | 8080 |
| instana-mcp/ | Instana MCP サーバー（Bob用） | - |

## 技術スタック

- フロントエンド: Next.js + Tailwind CSS
- バックエンド: Node.js + Express
- DB: SQLite (better-sqlite3)
- 監視: IBM Instana (@instana/collector)
- AI エージェント: IBM Bob（GitHub MCP + Instana MCP）
- プロセス管理: PM2
- ホスティング: AWS EC2 (t3.small)
- 通知: Slack Bot API

## デモシナリオ

1. エラー発火ツールで **N+1クエリ バグ注入**
2. IBM Instana がレイテンシ急増を検知・スマートアラート発火
3. Instana Webhook → ob-webhook が受信し Slack に通知
4. IBM Bob が自動起動、Instana MCP でイベント・メトリクスを取得
5. Bob がソースコードを分析し原因を特定
6. GitHub に **修正PR を自動作成**、Slack のスレッドに結果を投稿
7. エンジニアが PR をレビュー・マージして復旧
   （または エラー発火ツールの **手動修正ボタン** で即時解除）

## アクセス先

| サービス | URL |
|---------|-----|
| オンラインショップ | http://3.227.230.6:3000 |
| エラー発火ツール | http://3.227.230.6:8001 |
| バックエンドAPI | http://3.227.230.6:8000 |
| Instana | https://ibmdevsandbox-instanaibm.instana.io/ |

## セットアップ

### 1. リポジトリをクローン

`ash
git clone https://github.com/S-TANAKAIBM/instana-bob-demo.git
cd instana-bob-demo
`

### 2. 各ディレクトリで npm install

`ash
cd backend && npm install
cd ../frontend && npm install
cd ../error-roulette && npm install
cd ../bob-webhook && npm install
cd ../instana-mcp && npm install
`

### 3. 環境変数を設定

rontend/.env.local を作成：

`
NEXT_PUBLIC_API_URL=http://<サーバーIP>:8000
`

ob-webhook/ecosystem.config.js に以下を設定：

`
BOB_API_KEY=<Bob API キー>
GITHUB_TOKEN=<GitHub PAT>
`

### 4. 起動

`ash
# backend / error-roulette / bob-webhook
pm2 start backend/src/index.js --name backend
pm2 start error-roulette/src/index.js --name error-roulette
pm2 start bob-webhook/ecosystem.config.js

# frontend
cd frontend && npm run build && pm2 start npm --name frontend -- start

# 起動状態確認
pm2 list
`

## エラー発火ツールの種類

| カテゴリ | 内容 |
|---------|------|
| HTTP Error | 501 Not Implemented |
| Infrastructure | メモリリーク / CPU使用率100% / ディスク容量不足 |
| Database | DBタイムアウト / デッドロック検知 |
| Performance | スロークエリ |
| Bug Inject | **N+1クエリ バグ注入**（Instana → Bob 自動調査のメインシナリオ） |

## 注意事項

- .pem ファイルは絶対に Git にコミットしないでください
- rontend/.env.local は .gitignore に含まれています
- ob-webhook/processing-events.json は実行時に自動生成されます（.gitignore 対象）
- デモ用途のため、本番環境での使用は想定していません

## 参考

- [IBM Instana Observability](https://www.ibm.com/products/instana)
- [IBM Bob](https://www.ibm.com/products/ibm-bob)
- [GitHub リポジトリ](https://github.com/S-TANAKAIBM/instana-bob-demo)
