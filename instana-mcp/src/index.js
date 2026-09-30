const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const https = require('https');
const { z } = require('zod');

const INSTANA_BASE_URL = process.env.INSTANA_BASE_URL || 'https://ibmdevsandbox-instanaibm.instana.io';
const INSTANA_API_TOKEN = process.env.INSTANA_API_TOKEN || '';

// Instana REST APIを呼び出す共通関数
function instanaRequest(path, method, body) {
  return new Promise(function(resolve, reject) {
    const url = new URL(INSTANA_BASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      method: method || 'GET',
      headers: {
        'Authorization': 'apiToken ' + INSTANA_API_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = new McpServer({
  name: 'instana-mcp-server',
  version: '1.0.0'
});

// ツール1: イベント取得
server.tool(
  'get_event',
  'Instanaのイベント詳細を取得する',
  {
    eventId: z.string().describe('InstanaのイベントID')
  },
  async function(args) {
    try {
      const data = await instanaRequest('/api/events/' + args.eventId, 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// ツール2: イベント一覧取得
server.tool(
  'list_events',
  'Instanaの最近のイベント一覧を取得する',
  {
    windowSize: z.number().optional().describe('取得する時間範囲（ミリ秒）。デフォルト: 3600000（1時間）'),
    state: z.string().optional().describe('フィルター: OPEN or CLOSED')
  },
  async function(args) {
    try {
      const windowSize = args.windowSize || 3600000;
      const to = Date.now();
      const from = to - windowSize;
      let path = '/api/events?from=' + from + '&to=' + to;
      if (args.state) path += '&state=' + args.state;
      const data = await instanaRequest(path, 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// ツール3: アプリケーション一覧取得
server.tool(
  'list_applications',
  'Instanaで監視中のアプリケーション一覧を取得する',
  {},
  async function() {
    try {
      const data = await instanaRequest('/api/application-monitoring/applications', 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// ツール4: サービス一覧取得
server.tool(
  'list_services',
  'Instanaで監視中のサービス一覧を取得する',
  {},
  async function() {
    try {
      const data = await instanaRequest('/api/application-monitoring/services', 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// ツール5: インフラストラクチャー（スナップショット）取得
server.tool(
  'get_infrastructure',
  'Instanaのインフラスナップショット情報を取得する',
  {
    query: z.string().optional().describe('検索クエリ（例: entity.type:host）')
  },
  async function(args) {
    try {
      const q = args.query ? '?q=' + encodeURIComponent(args.query) : '';
      const data = await instanaRequest('/api/infrastructure-monitoring/snapshots' + q, 'GET');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// ツール6: メトリクス取得
server.tool(
  'get_metrics',
  'アプリケーションのメトリクス（エラー率・レイテンシーなど）を取得する',
  {
    applicationId: z.string().describe('アプリケーションID'),
    metric: z.string().optional().describe('メトリクス名（例: erroneousCalls, latency）'),
    windowSize: z.number().optional().describe('取得する時間範囲（ミリ秒）。デフォルト: 3600000')
  },
  async function(args) {
    try {
      const windowSize = args.windowSize || 3600000;
      const to = Date.now();
      const body = {
        timeFrame: { windowSize: windowSize, to: to },
        applicationId: args.applicationId,
        metrics: [{ metric: args.metric || 'erroneousCalls', aggregation: 'SUM' }]
      };
      const data = await instanaRequest('/api/application-monitoring/metrics/applications', 'POST', body);
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      };
    } catch(e) {
      return { content: [{ type: 'text', text: 'Error: ' + e.message }] };
    }
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Instana MCP server started\n');
}

main().catch(function(e) {
  process.stderr.write('Fatal: ' + e.message + '\n');
  process.exit(1);
});
