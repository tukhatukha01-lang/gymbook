#!/usr/bin/env node
/**
 * Мини-сервер для локальной проверки продакшен-сборки без зависимостей.
 * Повторяет поведение nginx из deploy/default.conf.template:
 * SPA-fallback, MIME для webmanifest, запрет кэша для index/sw, заголовки безопасности.
 *
 * Запуск: node scripts/serve.js   (PORT=4173 по умолчанию)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
};

function send(res, status, body, headers) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

function serveFile(res, filePath, urlPath) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
  const noCache = urlPath === '/' || urlPath === '/index.html' || urlPath === '/sw.js' || urlPath === '/manifest.webmanifest';
  if (noCache) headers['Cache-Control'] = 'no-cache';
  else if (urlPath.startsWith('/icons/')) headers['Cache-Control'] = 'public, max-age=2592000';
  else if (urlPath.startsWith('/fonts/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => send(res, 500, 'Internal Server Error', { 'Content-Type': 'text/plain' }));
  res.writeHead(200, { ...SECURITY, ...headers });
  stream.pipe(res);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/healthz') {
    return send(res, 200, 'ok\n', { 'Content-Type': 'text/plain' });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain' });
  }

  let filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) return serveFile(res, filePath, urlPath);
    if (!err && stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      if (fs.existsSync(index)) return serveFile(res, index, '/index.html');
    }
    const fallback = path.join(ROOT, 'index.html');
    if (fs.existsSync(fallback) && !path.extname(urlPath)) return serveFile(res, fallback, '/index.html');
    return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
  });
}).listen(PORT, () => {
  console.log(`GymBook preview: http://localhost:${PORT}`);
});
