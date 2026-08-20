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

/**
 * Generate SVG for LinkedIn Company Page banner (4200×700, transparent, lockup centered)
 */
function generateLinkedInCompanyBannerSVG() {
  const W = 4200;
  const H = 700;
  // Lockup SVG viewBox is 220×48, scale to ~40% of banner height for good visibility
  // This gives clear space of ~30% on top/bottom, well above the 0.5x minimum
  const lockupScale = (H * 0.40) / 48; // ~5.83
  const lockupW = 220 * lockupScale;
  const lockupH = 48 * lockupScale;
  const lockupX = (W - lockupW) / 2;
  const lockupY = (H - lockupH) / 2;

  const fontFace = `@font-face{font-family:Inter;font-style:normal;font-weight:400 700;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2) format("woff2");}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style type="text/css">${fontFace}</style>
    <linearGradient id="gradL" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#0A1628"/>
      <stop offset="100%" stop-color="#5EEAD4"/>
    </linearGradient>
    <linearGradient id="gradIcon" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#0A1628"/>
      <stop offset="100%" stop-color="#5EEAD4"/>
    </linearGradient>
  </defs>
  <g transform="translate(${lockupX}, ${lockupY}) scale(${lockupScale})">
    <g transform="translate(0,0) scale(0.952)">
      <rect x="2" y="36" width="10" height="10" rx="3" fill="#0A1628"/>
      <rect x="15" y="22" width="10" height="18" rx="3" fill="url(#gradIcon)"/>
      <rect x="28" y="6" width="10" height="28" rx="3" fill="#5EEAD4"/>
    </g>
    <text x="48" y="33" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="400" fill="#0A1628">latam </text>
    <text x="102" y="33" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700">
      <tspan fill="#0A1628">sca</tspan>
      <tspan font-size="29" fill="url(#gradL)">l</tspan>
      <tspan font-size="20" fill="#0A1628">ers</tspan>
    </text>
  </g>
</svg>`;
}

/**
 * Generate SVG for LinkedIn Company Page banner with tagline only (4200×700, transparent)
 * Tagline: "Your dedicated Creative team, on-demand"
 */
function generateLinkedInCompanyBannerTaglineSVG() {
  const W = 4200;
  const H = 700;
  const centerX = W / 2;
  const centerY = H / 2;
  
  // Font sizes optimized for 4200×700 banner - larger for better visibility
  const mainFontSize = 96;
  const accentFontSize = 96;
  
  const fontFace = `@font-face{font-family:Inter;font-style:normal;font-weight:300 700;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2) format("woff2");}`;

  // Brand colors
  const midnight = '#0A1628';
  const aqua = '#5EEAD4';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style type="text/css">${fontFace}</style>
    <linearGradient id="textGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${midnight}"/>
      <stop offset="100%" stop-color="${aqua}"/>
    </linearGradient>
  </defs>
  <text x="${centerX}" y="${centerY}" 
        font-family="Inter,Arial,sans-serif" 
        text-anchor="middle" 
        dominant-baseline="middle"
        letter-spacing="-2"
        font-size="${mainFontSize}">
    <tspan font-weight="400" fill="${midnight}">Your dedicated</tspan>
    <tspan font-weight="700" fill="url(#textGrad)"> Creative </tspan>
    <tspan font-weight="400" fill="${midnight}">team, on-demand</tspan>
  </text>
</svg>`;
}

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

  // Build LinkedIn Company Page Banner with Logo (4200×700 transparent)
  console.log('\n  linkedin-company-banner-light-transparent.png...');
  const bannerSvg = generateLinkedInCompanyBannerSVG();
  const bannerOutPath = path.join(ASSETS_DIR, 'latamscalers-linkedin-company-banner-light-transparent.png');
  
  try {
    await sharp(Buffer.from(bannerSvg, 'utf8'))
      .png({ compressionLevel: 6, palette: false })
      .toFile(bannerOutPath);

    const bannerMeta = await sharp(bannerOutPath).metadata();
    const { data: bannerData } = await sharp(bannerOutPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let bannerTransparentCount = 0;
    for (let j = 3; j < bannerData.length; j += 4) {
      if (bannerData[j] < 255) bannerTransparentCount++;
    }
    const fileSizeKB = Math.round(fs.statSync(bannerOutPath).size / 1024);
    console.log('    OK: ' + bannerMeta.width + 'x' + bannerMeta.height + ', ' + bannerTransparentCount + ' transparent pixels, ' + fileSizeKB + ' KB');
  } catch (err) {
    console.error('    FAIL: ' + err.message);
  }

  // Build LinkedIn Company Page Banner with Tagline only (4200×700 transparent)
  console.log('\n  linkedin-company-banner-tagline-transparent.png...');
  const taglineBannerSvg = generateLinkedInCompanyBannerTaglineSVG();
  const taglineBannerOutPath = path.join(ASSETS_DIR, 'latamscalers-linkedin-company-banner-tagline-transparent.png');
  
  try {
    await sharp(Buffer.from(taglineBannerSvg, 'utf8'))
      .png({ compressionLevel: 6, palette: false })
      .toFile(taglineBannerOutPath);

    const taglineMeta = await sharp(taglineBannerOutPath).metadata();
    const { data: taglineData } = await sharp(taglineBannerOutPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let taglineTransparentCount = 0;
    for (let j = 3; j < taglineData.length; j += 4) {
      if (taglineData[j] < 255) taglineTransparentCount++;
    }
    const taglineFileSizeKB = Math.round(fs.statSync(taglineBannerOutPath).size / 1024);
    console.log('    OK: ' + taglineMeta.width + 'x' + taglineMeta.height + ', ' + taglineTransparentCount + ' transparent pixels, ' + taglineFileSizeKB + ' KB');
  } catch (err) {
    console.error('    FAIL: ' + err.message);
  }

  await browser.close();
  console.log('\nDone. PNGs saved to png/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
