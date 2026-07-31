const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..', '..');
const SOURCE_ROOT = path.join(rootDir, 'logo.jpeg');
const SOURCE_PUBLIC = path.join(__dirname, '../public/satkar-logo.jpeg');

const SOURCE = fs.existsSync(SOURCE_ROOT) ? SOURCE_ROOT : SOURCE_PUBLIC;
const OUT_DIR = path.join(__dirname, '../public');

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source logo not found at ${SOURCE}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const bgCream = { r: 250, g: 247, b: 242, alpha: 1 };

  // Standard icon - 192x192
  await sharp(SOURCE)
    .resize(192, 192, { fit: 'contain', background: bgCream })
    .png()
    .toFile(path.join(OUT_DIR, 'pwa-192x192.png'));

  // Standard icon - 512x512
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: bgCream })
    .png()
    .toFile(path.join(OUT_DIR, 'pwa-512x512.png'));

  // Maskable icon - 512x512 with ~20% safe-zone padding
  await sharp(SOURCE)
    .resize(410, 410, { fit: 'contain', background: bgCream })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: bgCream,
    })
    .png()
    .toFile(path.join(OUT_DIR, 'maskable-icon-512x512.png'));

  console.log('All PWA icons generated successfully in client/public/');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
