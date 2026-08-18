/**
 * scripts/validate-qr.js
 *
 * Generates the branded QR code (same parameters as the API route) for the
 * given slug and decodes it with jsQR to confirm the encoded URL is correct.
 *
 * Run:  node scripts/validate-qr.js [slug]
 *       node scripts/validate-qr.js adaeze-ankara
 */

'use strict';

const QRCode  = require('qrcode');
const { PNG } = require('pngjs');
const jsQR    = require('jsqr');
const path    = require('path');
const fs      = require('fs');

const APP_URL = 'https://ibuynaija.com';

async function validate(slug) {
  const profileUrl = `${APP_URL}/shop/${slug}`;
  console.log('Target URL :', profileUrl);

  // ── Generate (mirror the API route parameters exactly) ───────────────────
  const buffer = await QRCode.toBuffer(profileUrl, {
    type:                 'png',
    width:                900,
    margin:               4,
    errorCorrectionLevel: 'M',
    color: {
      dark:  '#1B2A4A',
      light: '#FFFFFF',
    },
  });

  console.log(`Generated  : ${buffer.length} bytes  (${Math.round(buffer.length / 1024)} KB)`);

  // Save to disk for visual inspection
  const outPath = path.join(__dirname, `qr-${slug}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved to   : ${outPath}`);

  // ── Decode with jsQR ─────────────────────────────────────────────────────
  const png = PNG.sync.read(buffer);
  const code = jsQR(
    new Uint8ClampedArray(png.data.buffer),
    png.width,
    png.height,
  );

  if (!code) {
    console.error('\nFAIL: jsQR could not decode the QR code.');
    process.exit(1);
  }

  console.log(`Decoded    : ${code.data}`);

  if (code.data === profileUrl) {
    console.log('\nPASS: decoded URL matches the target URL exactly.\n');
  } else {
    console.error(`\nFAIL: URL mismatch.\n  got      : ${code.data}\n  expected : ${profileUrl}`);
    process.exit(1);
  }
}

const slug = process.argv[2] || 'adaeze-ankara';
validate(slug).catch(err => { console.error(err); process.exit(1); });
