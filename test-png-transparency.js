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

async function main() {
  console.log('E2E Test: PNG Transparency\n');

  const pngPath = path.join(ASSETS_PNG, 'latamscalers-lockup-light-transparent.png');
  if (!fs.existsSync(pngPath)) {
    console.error('Pre-built PNG not found. Run: npm run build:png');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 2. Verify PNG has transparency using sharp
  console.log('\n2. Verifying PNG has transparent pixels...');
  const meta = await sharp(pngPath).metadata();
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 4 = RGBA
  const hasAlpha = channels === 4;
  if (!hasAlpha) {
    console.error('   FAIL: PNG does not have an alpha channel (channels=' + channels + ')');
    process.exit(1);
  }

  let transparentCount = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) transparentCount++;
  }

  if (transparentCount === 0) {
    console.error('   FAIL: No transparent pixels found — PNG appears opaque');
    process.exit(1);
  }

  console.log('   OK: PNG has alpha channel, ' + transparentCount + ' transparent pixels');

  console.log('\n--- PASS ---\n');
  console.log('PNG is transparent (RGBA, ' + transparentCount + ' transparent pixels).');
  console.log('Visual proof: Open transparency-proof.html in a browser.');
  console.log('  PNG: ' + pngPath);
  console.log('  Proof page: ' + PROOF_HTML);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
