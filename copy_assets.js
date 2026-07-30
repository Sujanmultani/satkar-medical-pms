const fs = require('fs');
const path = require('path');

const srcLogo = path.join(__dirname, 'logo.jpeg');
const destDir = path.join(__dirname, 'client', 'src', 'assets');
const publicDir = path.join(__dirname, 'client', 'public');
const destLogo = path.join(destDir, 'satkar-logo.jpeg');
const publicLogo = path.join(publicDir, 'satkar-logo.jpeg');

if (fs.existsSync(srcLogo)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(srcLogo, destLogo);
  fs.copyFileSync(srcLogo, publicLogo);
  console.log('[Satkar Assets] Copied satkar-logo.jpeg to client/src/assets/ & client/public/');

  try {
    const sharp = require('sharp');
    (async () => {
      await sharp(srcLogo).resize(192, 192, { fit: 'contain', background: { r: 250, g: 247, b: 242, alpha: 1 } }).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
      await sharp(srcLogo).resize(512, 512, { fit: 'contain', background: { r: 250, g: 247, b: 242, alpha: 1 } }).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
      await sharp(srcLogo).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
      await sharp(srcLogo).resize(180, 180, { fit: 'contain', background: { r: 250, g: 247, b: 242, alpha: 1 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
      await sharp(srcLogo).resize(64, 64, { fit: 'contain', background: { r: 250, g: 247, b: 242, alpha: 1 } }).png().toFile(path.join(publicDir, 'favicon.png'));
      console.log('[Satkar Assets] PWA Icons (192x192, 512x512, maskable, apple-touch) generated cleanly with sharp!');
    })();
  } catch (err) {
    console.warn('[Satkar Assets] Sharp processing notice:', err.message);
  }
} else {
  console.warn('[Satkar Assets] Source logo.jpeg not found in root.');
}
