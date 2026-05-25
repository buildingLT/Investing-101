/**
 * Groww Gmail Sync — fetches Contract Note & Daily Margin Statement PDFs
 * from noreply@groww.in and imports them into the portfolio DB.
 *
 * Setup:
 *   1. Enable Gmail API at console.cloud.google.com
 *   2. Create OAuth 2.0 credentials (Desktop app), download as credentials.json
 *   3. On first run: npx ts-node scripts/gmail-sync.ts --auth
 *      (opens browser, saves token to scripts/token.json)
 *   4. Subsequent runs: npx ts-node scripts/gmail-sync.ts
 *
 * Cron (daily at 8am):
 *   0 8 * * * cd /path/to/Investing-101 && npx ts-node scripts/gmail-sync.ts >> logs/gmail-sync.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { URL } from 'url';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import pdfParse from 'pdf-parse';
import { parseGrowwPDF } from '../src/lib/pdf-parser';

// ── Paths ────────────────────────────────────────────────────────────────────

const SCRIPTS_DIR = path.join(__dirname);
const CREDS_PATH = path.join(SCRIPTS_DIR, 'credentials.json');
const TOKEN_PATH = path.join(SCRIPTS_DIR, 'token.json');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const PROCESSED_LOG = path.join(LOGS_DIR, 'processed-emails.json');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const GROWW_SENDER = 'noreply@groww.in';
const SUBJECT_PATTERNS = [
  /^Report:\s*Contract Note/i,
  /^Report:\s*Daily Margin Statement/i,
];

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthClient(): Promise<OAuth2Client> {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(
      `credentials.json not found at ${CREDS_PATH}.\n` +
      'Download it from Google Cloud Console → APIs & Services → Credentials.'
    );
  }

  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    oauth2.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
    return oauth2;
  }

  return runAuthFlow(oauth2);
}

async function runAuthFlow(oauth2: OAuth2Client): Promise<OAuth2Client> {
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\nOpen this URL in your browser to authorise Gmail access:\n');
  console.log(authUrl);
  console.log('\nWaiting for redirect on http://localhost:3001/oauth/callback …\n');

  const code = await waitForOAuthCode(3001);
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('Token saved to scripts/token.json\n');
  return oauth2;
}

function waitForOAuthCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.includes('/oauth/callback')) return;
      const code = new URL(req.url, `http://localhost:${port}`).searchParams.get('code');
      res.end('<html><body><h2>Authorized! You can close this tab.</h2></body></html>');
      server.close();
      if (code) resolve(code);
      else reject(new Error('No code in callback'));
    });
    server.listen(port);
    server.on('error', reject);
  });
}

// ── Gmail helpers ─────────────────────────────────────────────────────────────

function loadProcessedIds(): Set<string> {
  if (!fs.existsSync(PROCESSED_LOG)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(PROCESSED_LOG, 'utf-8')));
}

function saveProcessedId(id: string) {
  const ids = loadProcessedIds();
  ids.add(id);
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(PROCESSED_LOG, JSON.stringify([...ids], null, 2));
}

function isGrowwEmail(from: string, subject: string): boolean {
  if (!from.toLowerCase().includes(GROWW_SENDER)) return false;
  return SUBJECT_PATTERNS.some(p => p.test(subject));
}

async function fetchGrowwEmails(auth: OAuth2Client, daysBack = 2) {
  const gmail = google.gmail({ version: 'v1', auth });
  const after = Math.floor((Date.now() - daysBack * 86_400_000) / 1000);

  const query = `from:${GROWW_SENDER} after:${after} has:attachment filename:pdf`;
  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 20 });
  return list.data.messages ?? [];
}

async function getMessageDetails(auth: OAuth2Client, msgId: string) {
  const gmail = google.gmail({ version: 'v1', auth });
  const msg = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
  const headers = msg.data.payload?.headers ?? [];
  const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value ?? '';
  const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value ?? '';
  const parts = msg.data.payload?.parts ?? [];
  return { from, subject, parts, msgId };
}

async function downloadAttachment(auth: OAuth2Client, msgId: string, attachmentId: string): Promise<Buffer> {
  const gmail = google.gmail({ version: 'v1', auth });
  const att = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: msgId,
    id: attachmentId,
  });
  const data = att.data.data ?? '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function findPdfParts(parts: any[]): { filename: string; attachmentId: string }[] {
  const pdfs: { filename: string; attachmentId: string }[] = [];
  function walk(p: any[]) {
    for (const part of p) {
      if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        pdfs.push({ filename: part.filename ?? 'attachment.pdf', attachmentId: part.body.attachmentId });
      }
      if (part.parts) walk(part.parts);
    }
  }
  walk(parts);
  return pdfs;
}

// ── Portfolio import ──────────────────────────────────────────────────────────

async function importToPortfolio(parseResult: ReturnType<typeof parseGrowwPDF>, subject: string) {
  const baseUrl = process.env.PORTFOLIO_URL ?? 'http://localhost:3000';

  if (parseResult.document_type === 'CONTRACT_NOTE' && parseResult.trades?.length) {
    console.log(`  Importing ${parseResult.trades.length} trade(s) from contract note…`);

    for (const trade of parseResult.trades) {
      const body = {
        asset_type: 'STOCK',
        name: trade.name,
        symbol: trade.symbol,
        quantity: trade.quantity,
        avg_buy_price: trade.rate,
        current_price: trade.rate,
        invested_amount: trade.net_amount,
        current_value: trade.net_amount,
        purchase_date: trade.trade_date,
        source: 'GROWW',
        notes: `Imported from: ${subject}`,
      };

      const res = await fetch(`${baseUrl}/api/investments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log(`    ✓ ${trade.type} ${trade.quantity}x ${trade.name} @ ₹${trade.rate}`);
      } else {
        console.error(`    ✗ Failed to save ${trade.name}: ${await res.text()}`);
      }
    }
  } else if (parseResult.document_type === 'MARGIN_STATEMENT' && parseResult.margin_statement) {
    const ms = parseResult.margin_statement;
    console.log(`  Margin Statement — Available: ₹${ms.margin_available}, Used: ₹${ms.margin_used}`);
    // Margin statements are logged but not saved as investments (informational only)
    const logPath = path.join(LOGS_DIR, `margin-${ms.date}.json`);
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(ms, null, 2));
    console.log(`  Saved to logs/margin-${ms.date}.json`);
  } else {
    console.log(`  ⚠ Unknown document type or no data extracted.`);
    if (parseResult.parse_errors?.length) {
      parseResult.parse_errors.forEach(e => console.log(`    - ${e}`));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isAuthMode = process.argv.includes('--auth');

  console.log(`[${new Date().toISOString()}] Groww Gmail Sync starting…`);

  let auth: OAuth2Client;
  try {
    auth = await getAuthClient();
  } catch (err) {
    console.error('Auth error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (isAuthMode) {
    console.log('Auth complete. Run without --auth for normal sync.');
    process.exit(0);
  }

  const processedIds = loadProcessedIds();
  const messages = await fetchGrowwEmails(auth);
  console.log(`Found ${messages.length} Groww email(s) in the last 2 days.`);

  let imported = 0;
  let skipped = 0;

  for (const msg of messages) {
    if (!msg.id) continue;
    if (processedIds.has(msg.id)) { skipped++; continue; }

    const { from, subject, parts, msgId } = await getMessageDetails(auth, msg.id);

    if (!isGrowwEmail(from, subject)) {
      skipped++;
      continue;
    }

    console.log(`\nProcessing: "${subject}"`);
    const pdfParts = findPdfParts(parts);

    if (pdfParts.length === 0) {
      console.log('  No PDF attachments found, skipping.');
      saveProcessedId(msgId);
      continue;
    }

    for (const { filename, attachmentId } of pdfParts) {
      console.log(`  Parsing ${filename}…`);
      try {
        const pdfBuffer = await downloadAttachment(auth, msgId, attachmentId);
        const { text } = await pdfParse(pdfBuffer);
        const result = parseGrowwPDF(text);
        await importToPortfolio(result, subject);
        imported++;
      } catch (err) {
        console.error(`  Error parsing ${filename}:`, err instanceof Error ? err.message : err);
      }
    }

    saveProcessedId(msgId);
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}.`);
}

main();
