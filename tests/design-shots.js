#!/usr/bin/env node
/* Дизайн-луп TroutMap: снимает скриншот-сет ключевых экранов для критики
   по docs/DESIGN.md (раздел bar.md). Локально:
     npm i --no-save playwright && npx playwright install chromium
     node tests/design-shots.js [outDir]
   В песочнице: CHROME_PATH=<chromium> node tests/design-shots.js */
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || '/tmp/design-shots';
const PORT = 8125;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((r) => server.listen(PORT, r));
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { ({ chromium } = require('playwright-core')); }
  const launchOpts = process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] }
    : {};
  const browser = await chromium.launch(launchOpts);

  async function series(theme) {
    const page = await (await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      deviceScaleFactor: 2, colorScheme: theme
    })).newPage();
    const tag = theme === 'dark' ? 'dark' : 'light';
    const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await shot('01-splash');
    await page.click('#splash-enter'); await page.waitForTimeout(700);
    await shot('02-map');
    await page.click('#fab-layers', { force: true }); await page.waitForTimeout(400);
    await shot('03-layers');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.click('#chip-country'); await page.waitForTimeout(400);
    await shot('04-countries');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.click('#view-toggle'); await page.waitForTimeout(600);
    await shot('05-list');
    await page.click('.vcard'); await page.waitForTimeout(1300);
    await page.click('#sheet-grip'); await page.waitForTimeout(500);
    await shot('06-card');
    await page.evaluate(() => { document.getElementById('sheet-scroll').scrollTop = 700; });
    await page.waitForTimeout(500);
    await shot('07-card-seasons');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await page.click('#fab-add', { force: true }); await page.waitForTimeout(400);
    await shot('08-add-form');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.click('#fab-assistant', { force: true }); await page.waitForTimeout(500);
    await shot('09-assistant');
    await page.context().close();
  }

  await series('light');
  await series('dark');
  await browser.close();
  server.close();
  console.log('design shots →', OUT);
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
