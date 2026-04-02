/**
 * One-off check: OMDb + Hugging Face endpoints respond OK (no secrets printed).
 * Run: node verify-apis.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const secretsPath = path.join(__dirname, 'local-secrets.js');
const raw = fs.readFileSync(secretsPath, 'utf8');
const apiKey = raw.match(/API_KEY:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
const hfToken = raw.match(/HF_API_TOKEN:\s*['"]([^'"]+)['"]/)?.[1] ?? '';

if (!apiKey || !hfToken) {
  console.error('FAIL: Could not read API_KEY / HF_API_TOKEN from local-secrets.js');
  process.exit(1);
}

const BASE = 'https://www.omdbapi.com/';
const HF_URL =
  'https://router.huggingface.co/hf-inference/models/katanemo/Arch-Router-1.5B/v1/chat/completions';

let ok = true;

// OMDb
const omdbUrl = `${BASE}?apikey=${encodeURIComponent(apiKey)}&i=tt15239678&plot=short`;
const omdbRes = await fetch(omdbUrl);
const omdbJson = await omdbRes.json();
if (!omdbRes.ok || omdbJson.Response !== 'True') {
  console.error('FAIL: OMDb', omdbRes.status, omdbJson.Error || omdbJson.Response);
  ok = false;
} else {
  console.log('OK: OMDb returned movie:', omdbJson.Title || '(title)');
}

// Hugging Face (minimal chat completion)
const hfRes = await fetch(HF_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${hfToken}`,
  },
  body: JSON.stringify({
    model: 'katanemo/Arch-Router-1.5B',
    messages: [
      { role: 'system', content: 'Reply with one word: pong' },
      { role: 'user', content: 'ping' },
    ],
    max_tokens: 8,
    temperature: 0,
  }),
});
const hfData = await hfRes.json().catch(() => ({}));
const hfText = hfData?.choices?.[0]?.message?.content;
if (!hfRes.ok || !hfText) {
  console.error('FAIL: HuggingFace', hfRes.status, hfData?.error || JSON.stringify(hfData).slice(0, 200));
  ok = false;
} else {
  console.log('OK: HuggingFace chat returned content (length', String(hfText).length + ')');
}

process.exit(ok ? 0 : 1);
