const express = require('express');
const { spawn } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const BOB_API_KEY = process.env.BOB_API_KEY || '';
const WORKSPACE = '/home/ubuntu/instana-bob-demo';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || '';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

app.use(express.json());

const PROCESSING_EVENTS_FILE = path.join(WORKSPACE, 'bob-webhook', 'processing-events.json');

function loadProcessingEvents() {
  try {
    if (fs.existsSync(PROCESSING_EVENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSING_EVENTS_FILE, 'utf8'));
      const now = Date.now();
      const fresh = Object.fromEntries(Object.entries(data).filter(([, ts]) => now - ts < 3600000));
      return fresh;
    }
  } catch(e) {}
  return {};
}

function saveProcessingEvents(events) {
  try { fs.writeFileSync(PROCESSING_EVENTS_FILE, JSON.stringify(events)); } catch(e) {}
}

let processingEvents = loadProcessingEvents();

function postToSlackAPI(text, threadTs) {
  return new Promise(function(resolve, reject) {
    const bodyObj = {
      channel: SLACK_CHANNEL_ID,
      text: text
    };
    if (threadTs) bodyObj.thread_ts = threadTs;

    const body = JSON.stringify(bodyObj);
    const options = {
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SLACK_BOT_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try {
          const parsed = JSON.parse(data);
          console.log('[SLACK] Posted, ok:', parsed.ok, parsed.error || '');
          resolve(parsed.ts || null);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', function(e) {
      console.error('[SLACK] Error:', e.message);
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bob-webhook' });
});

app.post('/webhook/instana', (req, res) => {
  const payload = req.body;
  console.log('[WEBHOOK] Received Instana alert:', JSON.stringify(payload, null, 2));

  const issue       = payload.issue || payload.alert || {};
  const alertTitle  = issue.text || issue.title || payload.title || 'Unknown Alert';
  const eventIdRaw  = issue.id || (payload.events && payload.events[0] && payload.events[0].id) || payload.id || 'N/A';
  const eventId     = eventIdRaw !== 'N/A' ? eventIdRaw.replace(/[^a-zA-Z0-9]/g, '_') : 'N/A';
  const appName     = issue.entityLabel || issue.entity || issue.service || issue.applicationName || 'N/A';
  const state       = issue.state || payload.state || 'OPEN';

  processingEvents = loadProcessingEvents();
  if (eventId !== 'N/A' && processingEvents[eventId]) {
    console.log('[WEBHOOK] Duplicate event ignored:', eventId);
    return res.json({ status: 'skipped', message: 'Already processing this event', eventId: eventId });
  }
  if (eventId !== 'N/A') {
    processingEvents[eventId] = Date.now();
    saveProcessingEvents(processingEvents);
  }

  const severity    = issue.severity || payload.severity || 'warning';
  const description = issue.suggestion || issue.description || '';
  const alertLink   = issue.link || '';
  const severityLabel = severity === 5 ? 'Warning' : (severity === 10 ? 'Critical' : String(severity));

  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const logFile = path.join(WORKSPACE, 'bob-webhook', 'bob-run.log');
  const alertLogFile = path.join(WORKSPACE, 'bob-webhook', 'bob-run-' + (eventId !== 'N/A' ? eventId : Date.now()) + '.log');
  fs.appendFileSync(logFile, '\n[' + timestamp + '] Alert received: ' + alertTitle + '\n');
  fs.writeFileSync(alertLogFile, '[' + timestamp + '] Alert received: ' + alertTitle + '\n');

  const safeEventId = eventId !== 'N/A' ? eventId : 'unknown';
  const startMsg = [
    ':rotating_light: *Instana Alert 受信 — Bob が調査を開始します*',
    '*アラート:* ' + alertTitle,
    description ? ('*詳細:* ' + description) : '',
    '*対象:* ' + appName,
    '*重大度:* ' + severityLabel,
    '*イベントID:* ' + eventId,
    alertLink ? ('*Instana:* ' + alertLink) : '',
    '_Bob is analyzing..._',
    '`	ail -f ~/instana-bob-demo/bob-webhook/bob-run-' + safeEventId + '.log`',
  ].filter(Boolean).join('\n');

  postToSlackAPI(startMsg).then(function(threadTs) {
    console.log('[WEBHOOK] Thread ts:', threadTs);

    const slackInstruction = threadTs
      ? '最後に必ずSlack Bot Token=' + SLACK_BOT_TOKEN + ' ChannelID=' + SLACK_CHANNEL_ID + ' thread_ts=' + threadTs + ' を使ってchat.postMessage APIでスレッドに結果を投稿してください。'
      : '最後に必ず以下のURLにcurlコマンドで結果を投稿してください。URL: ' + SLACK_WEBHOOK_URL;

    const prompt = [
      'Instana自動アラート調査を行ってください。',
      'アラートタイトル: ' + alertTitle,
      description ? ('説明: ' + description) : '',
      'イベントID: ' + eventId,
      '対象アプリ: ' + appName,
      '状態: ' + state,
      '重大度: ' + severity,
      alertLink ? ('参照URL: ' + alertLink) : '',
      '受信時刻: ' + timestamp,
      '手順: Instana MCPでイベント詳細とログを取得し、ソースコードで原因を特定してください。',
      '【重要】backend/src/index.js の inject_latency・fix_latency・latencyInjected に関するコードはデモ用途のため絶対に削除・変更しないでください。',
      'コード修正が必要な場合は必ず fix/' + eventId + ' という名前の新しいブランチを作成してgit commitし、GitHub Pull Requestを作成してください。既存のブランチと衝突しても新しいブランチ名を使ってください。',
      'コード修正が不要な場合はGitHub Issueとして調査結果を作成してください。',
      slackInstruction,
      'Slack投稿内容: 根本原因、対応内容（PR or Issue）、GitHub URL、修正の概要を含めてください。',
    ].filter(Boolean).join(' ');

    const bobEnv = Object.assign({}, process.env, {
      BOB_API_KEY: BOB_API_KEY,
      FORCE_COLOR: '0',
      NODE_NO_WARNINGS: '1'
    });

    console.log('[WEBHOOK] Starting Bob analysis...');
    const alertLogFd = fs.openSync(alertLogFile, 'a');
    const mainLogFd  = fs.openSync(logFile, 'a');

    const bobProc = spawn('bob', ['run', '--accept-license', '--trust', '--workspace', WORKSPACE, '--format', 'pretty', prompt], {
      cwd: WORKSPACE,
      env: bobEnv,
      stdio: ['ignore', alertLogFd, alertLogFd]
    });

    const timer = setTimeout(function() {
      bobProc.kill();
      console.log('[WEBHOOK] Bob timed out');
    }, 600000);

    bobProc.on('close', function(code) {
      clearTimeout(timer);
      fs.closeSync(alertLogFd);
      fs.closeSync(mainLogFd);
      try { fs.appendFileSync(logFile, fs.readFileSync(alertLogFile)); } catch(e) {}
      if (code !== 0) {
        console.error('[WEBHOOK] Bob exited with code:', code);
      } else {
        console.log('[WEBHOOK] Bob analysis completed');
        postToSlackAPI(':white_check_mark: *Bob 調査完了* — 上記の結果をご確認ください。', threadTs);
      }
    });
  });

  res.json({ status: 'accepted', message: 'Bob analysis started', eventId: eventId });
});

app.listen(PORT, function() {
  console.log('[BOB-WEBHOOK] Server running on port ' + PORT);
  console.log('[BOB-WEBHOOK] Endpoint: POST http://localhost:' + PORT + '/webhook/instana');
});
