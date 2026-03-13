/**
 * Build transparent PNG logos for brochure/design software compatibility.
 * Uses sharp (librsvg) to render SVG→PNG with proper transparent backgrounds.
 * Playwright only used to get SVG strings from the page.
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

async function main() {
  console.log('Building transparent PNG logos (sharp/librsvg)...\n');

  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('file://' + INDEX_PATH.replace(/\\/g, '/'), {
    waitUntil: 'networkidle',
    timeout: 20000,
  });

  await page.waitForFunction(() => typeof window.getLogoSVGString === 'function', { timeout: 5000 });

  for (let i = 0; i < NAMES.length; i++) {
    const isLockup = i === 0 || i === 1 || i === 4 || i === 5;
    const w = isLockup ? 880 : 168;
    const h = 192;

    console.log('  ' + NAMES[i] + '.png...');
    const svgString = await page.evaluate((idx) => window.getLogoSVGString(idx, true), i);
    if (!svgString) {
      console.error('    FAIL: No SVG for index ' + i);
      continue;
    }

    const outPath = path.join(ASSETS_DIR, 'latamscalers-' + NAMES[i] + '-transparent.png');
    try {
      await sharp(Buffer.from(svgString, 'utf8'))
        .resize(w, h)
        .ensureAlpha()
        .png({ compressionLevel: 6, palette: false })
        .toFile(outPath);
    } catch (err) {
      console.error('    Sharp FAIL: ' + err.message + ' (browser canvas fallback)');
      const dataUrl = await page.evaluate(async (idx) => {
        const data = window.getLogoSVGString(idx, true);
        if (!data) return null;
        const s = idx === 0 || idx === 1 || idx === 4 || idx === 5 ? 4 : 4;
        const w = (idx === 0 || idx === 1 || idx === 4 || idx === 5) ? 220 * s : 42 * s;
        const h = (idx === 0 || idx === 1 || idx === 4 || idx === 5) ? 48 * s : 48 * s;
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
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
        });
      }, i);
      if (!dataUrl) continue;
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      await sharp(buf).ensureAlpha().png({ compressionLevel: 6 }).toFile(outPath);
    }

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
