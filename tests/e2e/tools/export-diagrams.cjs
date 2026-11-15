// Xuất các sơ đồ draw.io trong docs/diagrams ra PNG (dùng viewer chính thức của diagrams.net).
// Cách chạy (trong tests/e2e): node tools/export-diagrams.cjs <thư-mục-ra> [tên-file.drawio ...]
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const srcDir = path.join(repoRoot, 'docs', 'diagrams');
const outDir = path.resolve(process.argv[2] || path.join(srcDir, 'png'));
const only = process.argv.slice(3);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith('.drawio') && (only.length === 0 || only.includes(f)));
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL || undefined });
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 2400, height: 1600 } });
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff}</style></head><body></body></html>');
  await page.addScriptTag({ url: 'https://viewer.diagrams.net/js/viewer-static.min.js' });
  for (const file of files) {
    const xml = fs.readFileSync(path.join(srcDir, file), 'utf8');
    await page.evaluate((x) => {
      document.body.innerHTML = '<div id="d" style="display:inline-block;background:#fff;padding:16px"></div>';
      const el = document.getElementById('d');
      el.className = 'mxgraph';
      el.setAttribute('data-mxgraph', JSON.stringify({ xml: x, nav: false, toolbar: '', resize: true, border: 16 }));
      window.GraphViewer.createViewerForElement(el);
    }, xml);
    await page.locator('#d svg').first().waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForTimeout(800);
    const out = path.join(outDir, file.replace(/\.drawio$/, '.png'));
    await page.locator('#d').screenshot({ path: out });
    console.log('OK', out);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
