#!/usr/bin/env node
/*
 Copies client build (../client/dist) into server build output (./dist/public)
 Cross-platform, safe if client/dist is missing (warn only).
*/
const fs = require('fs');
const path = require('path');

const serverDist = path.resolve(__dirname, '..', 'dist');
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
const targetPublic = path.join(serverDist, 'public');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

try {
  if (!fs.existsSync(clientDist)) {
    console.warn('[copy-client] client/dist not found at', clientDist, '\nBuild the client first (npm run build in client) if you want the server to serve static assets.');
    process.exit(0);
  }
  if (!fs.existsSync(serverDist)) fs.mkdirSync(serverDist, { recursive: true });
  if (fs.existsSync(targetPublic)) {
    // clean existing
    fs.rmSync(targetPublic, { recursive: true, force: true });
  }
  copyDir(clientDist, targetPublic);
  console.log('[copy-client] Copied client/dist -> server/dist/public');
} catch (e) {
  console.error('[copy-client] Failed:', e);
  process.exit(1);
}
