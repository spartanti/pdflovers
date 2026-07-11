'use strict';

/**
 * PdfLovers — servidor estático de dependência zero.
 *
 * Filosofia de recursos:
 *  - Nenhum PDF passa pelo servidor: todo o processamento é client-side (no navegador).
 *  - O servidor só entrega arquivos estáticos pequenos → RAM/CPU/rede mínimos.
 *  - Cache agressivo + gzip sob demanda (com cache em memória por mtime).
 *
 * Sem frameworks, sem node_modules. Roda em qualquer lugar (Railway, Fly, VPS).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest', '.wasm',
]);

// Cache leve em memória: caminho -> { mtime, buffer, gzip, etag, type }
// Arquivos são pequenos, então o custo de RAM é desprezível.
const cache = new Map();

function loadFile(filePath) {
  const stat = fs.statSync(filePath); // lança se não existir
  const cached = cache.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs) return cached;

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = '"' + crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16) + '"';
  const gzip = COMPRESSIBLE.has(ext) && buffer.length > 512
    ? zlib.gzipSync(buffer, { level: 8 })
    : null;

  const entry = { mtime: stat.mtimeMs, buffer, gzip, etag, type, ext };
  cache.set(filePath, entry);
  return entry;
}

function cacheControl(ext, pathname) {
  // Bibliotecas vendorizadas nunca mudam de conteúdo → cache imutável (1 ano).
  if (pathname.startsWith('/vendor/')) return 'public, max-age=31536000, immutable';
  if (['.woff2', '.woff', '.wasm'].includes(ext)) return 'public, max-age=31536000, immutable';
  // CSS/JS do app podem mudar a cada deploy → revalida via ETag (304 é minúsculo).
  if (['.css', '.js', '.mjs', '.webmanifest'].includes(ext)) return 'no-cache';
  // Imagens/ícones: cache curto.
  if (['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(ext)) return 'public, max-age=3600';
  return 'no-cache'; // HTML sempre revalida
}

function safeResolve(urlPath) {
  // Impede path traversal.
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  let rel = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  if (rel.endsWith('/')) rel += 'index.html';
  const full = path.join(ROOT, rel);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Allow': 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let filePath = safeResolve(req.url);
  if (!filePath) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  // Diretório -> index.html
  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch (_) { /* segue e cai no 404 */ }

  // Extensão limpa: /tools/juntar -> /tools/juntar.html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) filePath += '.html';
  }

  let entry;
  try {
    entry = loadFile(filePath);
  } catch (_) {
    // 404 amigável
    try {
      entry = loadFile(path.join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': entry.type, 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : entry.buffer);
    } catch (_2) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
  }

  // Revalidação por ETag
  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304);
    return res.end();
  }

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const headers = {
    'Content-Type': entry.type,
    'Cache-Control': cacheControl(entry.ext, req.url),
    'ETag': entry.etag,
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding',
  };

  let body;
  if (entry.gzip && acceptsGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = entry.gzip.length;
    body = entry.gzip;
  } else {
    headers['Content-Length'] = entry.buffer.length;
    body = entry.buffer;
  }

  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(PORT, HOST, () => {
  console.log(`PdfLovers rodando em http://${HOST}:${PORT}`);
});
