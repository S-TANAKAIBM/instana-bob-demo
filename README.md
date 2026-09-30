# Instana x IBM Bob 障害自動対応デモ

IBM Instana でエラーを検知し、IBM Bob が原因分析から GitHub PR 作成までを自律的に実行するデモ環境です。

## 構成

| ディレクトリ | 役割 | ポート |
|---|---|---|
| backend/ | Express.js バックエンドAPI | 8000 |
| frontend/ | Next.js オンラインショップ | 3000 |
| error-roulette/ | エラー発火ツール | 8001 |
| bob-webhook/ | Instana アラート受信 → Bob 起動 | 8080 |
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

1. エラー発火ツールでエラーを発火
   （Bug Inject を選択すると N+1クエリ バグ注入のメインシナリオが実行されます）
2. IBM Instana がレイテンシ急増を検知・スマートアラート発火
3. Instana Webhook → bob-webhook が受信し Slack に通知
4. IBM Bob が自動起動、Instana MCP でイベント・メトリクスを取得
5. Bob がソースコードを分析し原因を特定
6. GitHub に **修正PR を自動作成**、Slack のスレッドに結果を投稿
7. エンジニアが PR をレビュー・マージして復旧
   または エラー発火ツールの **手動修正ボタン** で即時解除
   > ※ Bug Inject（N+1クエリ）は時間経過では復旧しないため、必ずどちらかの対応が必要です

## アクセス先

| サービス | URL |
|---|---|
| オンラインショップ | http://<サーバーIP>:3000 |
| エラー発火ツール | http://<サーバーIP>:8001 |
| バックエンドAPI | http://<サーバーIP>:8000 |
| Instana | https://ibmdevsandbox-instanaibm.instana.io/ |

## エラー発火ツールの種類

デモ中はどのエラーを発火しても問題ありません。
エラーの種類によって復旧方法が異なります。

| カテゴリ | 内容 | 復旧方法 |
|---|---|---|
| HTTP Error | 501 Not Implemented | 時間経過で自動復旧 |
| Infrastructure | メモリリーク / CPU使用率100% / ディスク容量不足 | 時間経過で自動復旧 |
| Database | DBタイムアウト / デッドロック検知 | 時間経過で自動復旧 |
| Performance | スロークエリ | 時間経過で自動復旧 |
| **Bug Inject** | **N+1クエリ バグ注入**（メインシナリオ） | **PRをマージするか、手動修正ボタンで解除が必要** |

> **Note**
> Bug Inject（N+1クエリ）はコードにバグを注入するため、時間経過では復旧しません。
> Bobが作成したPRをマージするか、エラー発火ツールの「手動修正ボタン」で解除してください。

## セットアップ

### 1. リポジトリをクローン

`
git clone https://github.com/S-TANAKAIBM/instana-bob-demo.git
cd instana-bob-demo
`

### 2. 各ディレクトリで npm install

`
cd backend && npm install
cd ../frontend && npm install
cd ../error-roulette && npm install
cd ../bob-webhook && npm install
cd ../instana-mcp && npm install
`

### 3. 環境変数を設定

frontend/.env.local を作成：

`
NEXT_PUBLIC_API_URL=http://<サーバーIP>:8000
`

bob-webhook/ecosystem.config.js に以下を設定：

`
BOB_API_KEY=<Bob API キー>
GITHUB_TOKEN=<GitHub PAT>
`

### 4. 起動

`
pm2 start backend/src/index.js --name backend
pm2 start error-roulette/src/index.js --name error-roulette
pm2 start bob-webhook/ecosystem.config.js
cd frontend && npm run build && pm2 start npm --name frontend -- start
pm2 list
`

## 注意事項

- .pem ファイルは絶対に Git にコミットしないでください
- frontend/.env.local は .gitignore に含まれています
- bob-webhook/processing-events.json は実行時に自動生成されます（.gitignore 対象）
- デモ用途のため、本番環境での使用は想定していません

## Slack Bot Token が無効化された場合

Slack は GitHub にトークンが push されると自動的にトークンを無効化します。
bob-webhook/ecosystem.config.js は .gitignore 対象のため Git には上がりませんが、
万が一無効化された場合は以下の手順で復旧してください。

1. https://api.slack.com/apps にアクセスし「Instana Alert」アプリを開く
2. OAuth & Permissions から Bot Token を再発行
3. EC2 の bob-webhook/ecosystem.config.js の SLACK_BOT_TOKEN を新しいトークンに更新
4. pm2 restart bob-webhook --update-env を実行

## 参考

- IBM Instana Observability: https://www.ibm.com/products/instana
- IBM Bob: https://www.ibm.com/products/ibm-bob
- GitHub リポジトリ: https://github.com/S-TANAKAIBM/instana-bob-demo
