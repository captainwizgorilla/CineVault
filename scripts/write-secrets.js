'use strict';
const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, '..', 'local-secrets.js');

if (process.env.VERCEL !== '1') {
  process.exit(0);
}

const obj = {
  API_KEY: process.env.TMDB_API_KEY || '',
  TMDB_READ_TOKEN: process.env.TMDB_READ_TOKEN || '',
  HF_API_TOKEN: process.env.HF_API_TOKEN || '',
};

fs.writeFileSync(outFile, `window.CineVaultSecrets = ${JSON.stringify(obj, null, 2)};\n`);
