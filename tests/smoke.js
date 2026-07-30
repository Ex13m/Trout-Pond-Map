#!/usr/bin/env node
/* Смоук-тест TroutMap Europe для CI (и локально).
   Требует: npm i --no-save playwright && npx playwright install chromium
   Проверяет: загрузку без JS-ошибок, размер базы, открытие карточки,
   список, i18n-полноту, модалку актуализации. Код выхода != 0 при провале. */
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PORT = 8123;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { ({ chromium } = require('playwright-core')); } // локальный запуск
  const launchOpts = process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] }
    : {};
  const browser = await chromium.launch(launchOpts);
  const page = await (await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
  })).newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1; };

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // 1. база
  const venues = await page.evaluate(() => (window.VENUES || []).length);
  console.log('venues:', venues);
  if (venues < 100) fail(`ожидалось >= 100 водоёмов, получено ${venues}`);

  // 2. i18n-полнота
  const missing = await page.evaluate(() => (window.I18N ? window.I18N.validate() : ['no I18N']));
  if (missing.length) fail('пропущены переводы: ' + missing.join(', '));

  // 3. вход и карточка
  await page.click('#splash-enter');
  await page.waitForTimeout(700);
  await page.click('#view-toggle');
  await page.waitForTimeout(600);
  await page.click('.vcard');
  await page.waitForTimeout(1000);
  const cardOpen = await page.isVisible('.vd__name');
  if (!cardOpen) fail('карточка водоёма не открылась');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. модалка актуализации существует
  await page.click('#fab-actualize', { force: true });
  await page.waitForTimeout(600);
  const passVisible = await page.isVisible('#act-pass-input');
  if (!passVisible) fail('модалка актуализации не открылась');

  // 5. JS-ошибки (сетевые сбои внешних хостов не считаются)
  const realErrors = errors.filter((e) => !/fetch|network|Failed to load/i.test(e));
  if (realErrors.length) fail('JS-ошибки: ' + realErrors.join(' | '));

  await browser.close();
  server.close();
  console.log(process.exitCode ? 'SMOKE FAILED' : 'SMOKE OK');
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
