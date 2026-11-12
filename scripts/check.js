#!/usr/bin/env node
/**
 * Проверка статической сборки без браузера:
 * обязательные файлы, манифест, service worker, локальные шрифты, синтаксис JS.
 * Запуск: npm run check
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
let errors = 0;
let checks = 0;

function ok(name) { checks++; console.log('  ok  ' + name); }
function fail(name, detail) { errors++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }

function exists(rel) {
  const p = path.join(PUBLIC, rel);
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

console.log('Файлы оболочки:');
for (const f of [
  'index.html', 'manifest.webmanifest', 'sw.js', 'offline.html', '404.html', 'robots.txt',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'fonts/manrope-cyrillic.woff2', 'fonts/manrope-cyrillic-ext.woff2',
  'fonts/manrope-latin.woff2', 'fonts/manrope-latin-ext.woff2'
]) {
  assert(exists(f), f);
}

console.log('\nМанифест:');
const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
assert(manifest.name && manifest.short_name, 'name / short_name');
assert(manifest.start_url === './' && manifest.scope === './', 'start_url и scope относительные');
assert(manifest.display === 'standalone', 'display=standalone');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'иконки 192/512/maskable');
for (const icon of manifest.icons || []) assert(exists(icon.src), 'иконка ' + icon.src);
for (const sc of manifest.shortcuts || []) assert(exists(sc.icons[0].src), 'shortcut ' + sc.url);

console.log('\nService worker:');
const sw = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8');
try { new Function(sw); ok('синтаксис sw.js'); } catch (e) { fail('синтаксис sw.js', e.message); }
const shell = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
for (const f of shell) assert(exists(f), 'precache ' + f);
const version = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert(version === pkg.version, 'VERSION совпадает с package.json', version + ' vs ' + pkg.version);

console.log('\nHTML:');
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
assert(/<link rel="manifest" href="manifest\.webmanifest">/.test(html), 'подключён манифест');
assert(/serviceWorker\.register\('\.\/sw\.js'/.test(html), 'регистрация sw.js');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dup.length === 0, 'нет дублирующихся id', [...new Set(dup)].join(', '));
const fonts = [...html.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m => m[1]);
assert(fonts.length >= 4, 'локальные @font-face');
for (const f of fonts) assert(exists(f), 'шрифт ' + f);
assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), 'нет внешних шрифтов Google');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert(scripts.length > 0, 'встроенный скрипт приложения');
scripts.forEach((code, i) => {
  try { new Function(code); ok('синтаксис script #' + (i + 1)); } catch (e) { fail('синтаксис script #' + (i + 1), e.message); }
});
assert(/id="ubar"/.test(html) && /id="btnInstall"/.test(html), 'UI обновления и установки');

console.log(`\nИтог: ${checks - errors}/${checks} проверок пройдено`);
process.exit(errors ? 1 : 0);
