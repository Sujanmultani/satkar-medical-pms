const fs = require('fs');
const path = require('path');

const srcLogo = path.join(__dirname, 'logo.jpeg');
const destDir = path.join(__dirname, 'client', 'src', 'assets');
const destLogo = path.join(destDir, 'satkar-logo.jpeg');

if (fs.existsSync(srcLogo)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcLogo, destLogo);
  console.log('[Satkar Assets] Copied satkar-logo.jpeg to client/src/assets/');
} else {
  console.warn('[Satkar Assets] Source logo.jpeg not found in root.');
}
