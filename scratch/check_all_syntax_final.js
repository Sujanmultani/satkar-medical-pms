const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'server/controllers/supplierController.js',
  'server/jobs/quarterlyBackupJob.js',
  'server/services/emailService.js',
  'server/controllers/itemController.js',
  'server/controllers/dashboardController.js',
  'server/controllers/invoiceController.js',
  'server/services/invoiceParser.js',
  'server/controllers/billController.js',
  'server/controllers/returnController.js',
  'server/models/Invoice.js'
];

let hasErrors = false;

filesToCheck.forEach((relPath) => {
  const fullPath = path.join(__dirname, '..', relPath);
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    new Function(code);
    console.log(`[OK] ${relPath}`);
  } catch (err) {
    // Note: async/await or require at top level might fail in new Function if strict, try via require
    try {
      require(fullPath);
      console.log(`[OK - require] ${relPath}`);
    } catch (reqErr) {
      console.error(`[ERROR] ${relPath}: ${reqErr.message}`);
      hasErrors = true;
    }
  }
});

if (!hasErrors) {
  console.log('\nALL SERVER FILES PASSED SYNTAX CHECK!');
}
