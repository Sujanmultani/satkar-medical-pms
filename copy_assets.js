const fs = require('fs');
const path = require('path');

function run() {
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
  } else {
    console.warn('[Satkar Assets] Source logo.jpeg not found in root.');
  }
}

run();
