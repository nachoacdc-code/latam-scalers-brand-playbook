/**
 * Build transparent PNG logos for brochure/design software compatibility.
 * Uses Playwright (browser) to render SVG→canvas, then sharp to ensure proper RGBA encoding.
 * Run: node scripts/build-pngs.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const ASSETS_DIR = path.join(ROOT, 'png');
const NAMES = ['lockup-light', 'lockup-dark', 'icon-only-light', 'icon-only-dark', 'lockup-mono-black', 'lockup-mono-white'];

async function generatePngDataUrl(page, i) {
  return page.evaluate(async (idx) => {
    const data = window.getLogoSVGString(idx, true);
    if (!data) return null;
    const isLockup = idx === 0 || idx === 1 || idx === 4 || idx === 5;
    const scale = 4;
    const w = isLockup ? 220 * scale : 42 * scale;
    const h = isLockup ? 48 * scale : 48 * scale;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    });
  }, i);
}

async function main() {
  console.log('Building transparent PNG logos...\n');

  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('file://' + INDEX_PATH.replace(/\\/g, '/'), {
    waitUntil: 'networkidle',
    timeout: 20000,
  });

  // Wait for fonts and DOM
  await page.waitForFunction(() => typeof window.getLogoSVGString === 'function', { timeout: 5000 });

  for (let i = 0; i < NAMES.length; i++) {
    console.log('  ' + NAMES[i] + '.png...');
    const dataUrl = await generatePngDataUrl(page, i);
    if (!dataUrl) {
      console.error('    FAIL: No data for index ' + i);
      continue;
    }
    const base64 = dataUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');

    const outPath = path.join(ASSETS_DIR, 'latamscalers-' + NAMES[i] + '-transparent.png');
    await sharp(buf)
      .ensureAlpha()
      .png({ compressionLevel: 6, palette: false })
      .toFile(outPath);

    const meta = await sharp(outPath).metadata();
    const { data } = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparentCount = 0;
    for (let j = 3; j < data.length; j += 4) {
      if (data[j] < 255) transparentCount++;
    }
    console.log('    OK: ' + meta.width + 'x' + meta.height + ', ' + transparentCount + ' transparent pixels');
  }

  await browser.close();
  console.log('\nDone. PNGs saved to png/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
