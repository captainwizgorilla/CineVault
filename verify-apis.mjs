/**
 * One-off check: TMDB + Hugging Face endpoints respond OK (no secrets printed).
 * Run: node verify-apis.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const secretsPath = path.join(__dirname, 'local-secrets.js');
const raw = fs.readFileSync(secretsPath, 'utf8');
const apiKey = raw.match(/API_KEY:\s*['"]([^'"]+)['"]/)?.[1] ?? '';
const readToken =
  raw.match(/TMDB_READ_TOKEN:\s*['"]([^'"]+)['"]/)?.[1] ??
  raw.match(/TMDB_READ_TOKEN:\s*\r?\n\s*['"]([^'"]+)['"]/)?.[1] ??
  '';
const hfToken = raw.match(/HF_API_TOKEN:\s*['"]([^'"]+)['"]/)?.[1] ?? '';

if ((!apiKey && !readToken) || !hfToken) {
  console.error('FAIL: Need TMDB (API_KEY and/or TMDB_READ_TOKEN) and HF_API_TOKEN in local-secrets.js');
  process.exit(1);
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const HF_URL =
  'https://router.huggingface.co/hf-inference/models/katanemo/Arch-Router-1.5B/v1/chat/completions';

let ok = true;

// TMDB (movie detail — Inception)
const tmdbPath = '/movie/27205';
let tmdbRes;
if (readToken) {
  tmdbRes = await fetch(`${TMDB_BASE}${tmdbPath}`, {
    headers: { Authorization: `Bearer ${readToken}` },
  });
} else {
  tmdbRes = await fetch(`${TMDB_BASE}${tmdbPath}?api_key=${encodeURIComponent(apiKey)}`);
}
const tmdbData = await tmdbRes.json().catch(() => ({}));
if (!tmdbRes.ok || !tmdbData.title) {
  console.error('FAIL: TMDB', tmdbRes.status, tmdbData.status_message || tmdbData.status_code || '');
  ok = false;
} else {
  console.log('OK: TMDB returned movie:', tmdbData.title);
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
