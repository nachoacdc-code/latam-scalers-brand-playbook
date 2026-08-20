/**
 * E2E test: Verify pre-built PNG logos have transparent backgrounds.
 * Run: npm run build:png && npm run test:png
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ASSETS_PNG = path.join(__dirname, 'png');
const OUTPUT_DIR = path.join(__dirname, 'test-output');
const PROOF_HTML = path.join(__dirname, 'assets', 'transparency-proof.html');

async function testPngTransparency(pngPath, expectedWidth, expectedHeight, maxSizeKB) {
  const filename = path.basename(pngPath);
  console.log('\n  Testing: ' + filename);

  if (!fs.existsSync(pngPath)) {
    console.error('    FAIL: File not found');
    return false;
  }

  const meta = await sharp(pngPath).metadata();
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Check dimensions
  if (expectedWidth && meta.width !== expectedWidth) {
    console.error('    FAIL: Width is ' + meta.width + ', expected ' + expectedWidth);
    return false;
  }
  if (expectedHeight && meta.height !== expectedHeight) {
    console.error('    FAIL: Height is ' + meta.height + ', expected ' + expectedHeight);
    return false;
  }

  // Check alpha channel
  const channels = info.channels;
  if (channels !== 4) {
    console.error('    FAIL: PNG does not have an alpha channel (channels=' + channels + ')');
    return false;
  }

  // Count transparent pixels
  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) transparentCount++;
  }

  if (transparentCount === 0) {
    console.error('    FAIL: No transparent pixels found — PNG appears opaque');
    return false;
  }

  // Check file size
  const fileSizeKB = Math.round(fs.statSync(pngPath).size / 1024);
  if (maxSizeKB && fileSizeKB > maxSizeKB) {
    console.error('    FAIL: File size is ' + fileSizeKB + ' KB, max allowed is ' + maxSizeKB + ' KB');
    return false;
  }

  // For banners, verify corners are transparent (no solid background)
  if (filename.includes('banner')) {
    const topLeftAlpha = data[3]; // First pixel alpha
    const topRightAlpha = data[(meta.width - 1) * 4 + 3];
    const bottomLeftAlpha = data[(meta.height - 1) * meta.width * 4 + 3];
    const bottomRightAlpha = data[data.length - 1];

    if (topLeftAlpha === 255 && topRightAlpha === 255 && bottomLeftAlpha === 255 && bottomRightAlpha === 255) {
      console.error('    FAIL: All corners are opaque — background may not be transparent');
      return false;
    }
  }

  console.log('    OK: ' + meta.width + 'x' + meta.height + ', ' + transparentCount + ' transparent pixels, ' + fileSizeKB + ' KB');
  return true;
}

async function main() {
  console.log('E2E Test: PNG Transparency\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let allPassed = true;

  // Test existing lockup PNG
  console.log('1. Testing logo PNGs...');
  const lockupPath = path.join(ASSETS_PNG, 'latamscalers-lockup-light-transparent.png');
  if (!await testPngTransparency(lockupPath)) {
    allPassed = false;
  }

  // Test LinkedIn Company Page Banner with Logo (4200×700, max 3MB = 3072KB)
  console.log('\n2. Testing LinkedIn Company Page Banner (Logo)...');
  const bannerPath = path.join(ASSETS_PNG, 'latamscalers-linkedin-company-banner-light-transparent.png');
  if (!await testPngTransparency(bannerPath, 4200, 700, 3072)) {
    allPassed = false;
  }

  // Test LinkedIn Company Page Banner with Tagline (4200×700, max 3MB = 3072KB)
  console.log('\n3. Testing LinkedIn Company Page Banner (Tagline)...');
  const taglineBannerPath = path.join(ASSETS_PNG, 'latamscalers-linkedin-company-banner-tagline-transparent.png');
  if (!await testPngTransparency(taglineBannerPath, 4200, 700, 3072)) {
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n--- ALL TESTS PASSED ---\n');
    console.log('All PNGs are transparent and meet specifications.');
    console.log('Visual proof: Open transparency-proof.html in a browser.');
    console.log('  Proof page: ' + PROOF_HTML);
  } else {
    console.log('\n--- SOME TESTS FAILED ---\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
