const fs = require('fs');
const path = require('path');

async function run() {
  const srcLogo = path.join(__dirname, 'logo.jpeg');
  const destDir = path.join(__dirname, 'client', 'src', 'assets');
  const publicDir = path.join(__dirname, 'client', 'public');
  const screenshotsDir = path.join(publicDir, 'screenshots');
  const destLogo = path.join(destDir, 'satkar-logo.jpeg');
  const publicLogo = path.join(publicDir, 'satkar-logo.jpeg');

  if (fs.existsSync(srcLogo)) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(screenshotsDir, { recursive: true });
    fs.copyFileSync(srcLogo, destLogo);
    fs.copyFileSync(srcLogo, publicLogo);
    console.log('[Satkar Assets] Copied satkar-logo.jpeg to client/src/assets/ & client/public/');

    try {
      const sharp = require('sharp');
      const bgTeal = { r: 11, g: 76, b: 82, alpha: 1 };
      const bgCream = { r: 250, g: 247, b: 242, alpha: 1 };

      // 1. Standard PNG icons
      await sharp(srcLogo).resize(192, 192, { fit: 'contain', background: bgCream }).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
      await sharp(srcLogo).resize(512, 512, { fit: 'contain', background: bgCream }).png().toFile(path.join(publicDir, 'pwa-512x512.png'));

      // 2. Maskable PNG icon with 20% safe-zone padding
      await sharp(srcLogo)
        .resize(360, 360, { fit: 'contain', background: bgCream })
        .extend({
          top: 76,
          bottom: 76,
          left: 76,
          right: 76,
          background: bgCream,
        })
        .png()
        .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));

      // 3. Additional touch & favicon PNG icons
      await sharp(srcLogo).resize(180, 180, { fit: 'contain', background: bgCream }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
      await sharp(srcLogo).resize(64, 64, { fit: 'contain', background: bgCream }).png().toFile(path.join(publicDir, 'favicon.png'));

      // 4. PWA Screenshots for Richer Install UI (wide & narrow)
      const logoResizedForDesktop = await sharp(srcLogo).resize(300, 300, { fit: 'contain', background: bgTeal }).toBuffer();
      await sharp({
        create: {
          width: 1280,
          height: 720,
          channels: 4,
          background: bgTeal,
        },
      })
        .composite([{ input: logoResizedForDesktop, gravity: 'center' }])
        .png()
        .toFile(path.join(screenshotsDir, 'desktop.png'));

      const logoResizedForMobile = await sharp(srcLogo).resize(250, 250, { fit: 'contain', background: bgTeal }).toBuffer();
      await sharp({
        create: {
          width: 750,
          height: 1334,
          channels: 4,
          background: bgTeal,
        },
      })
        .composite([{ input: logoResizedForMobile, gravity: 'center' }])
        .png()
        .toFile(path.join(screenshotsDir, 'mobile.png'));

      console.log('[Satkar Assets] PWA Icons & Rich Screenshots generated cleanly with sharp!');
    } catch (err) {
      console.warn('[Satkar Assets] Sharp processing notice:', err.message);
      process.exitCode = 1;
    }
  } else {
    console.warn('[Satkar Assets] Source logo not found, skipping.');
  }
}

run();
