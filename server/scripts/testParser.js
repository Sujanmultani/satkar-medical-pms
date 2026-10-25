const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { parseInvoiceImageWithGemini } = require('../services/invoiceParser');
const sharp = require('sharp');

async function createSampleInvoiceImage() {
  const svg = `
  <svg width="900" height="700" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="700" fill="#ffffff"/>
    <text x="50" y="60" font-size="24" font-weight="bold" font-family="sans-serif" fill="#111827">TAX INVOICE</text>
    <text x="50" y="100" font-size="20" font-weight="bold" font-family="sans-serif" fill="#1f2937">CAMBAY PHARMA AGENCIES</text>
    <text x="50" y="130" font-size="14" font-family="sans-serif" fill="#4b5563">GIDC Estate, Vadodara, Gujarat</text>
    <text x="50" y="170" font-size="15" font-family="sans-serif" fill="#111827">Invoice No: CB-2026-9041</text>
    <text x="350" y="170" font-size="15" font-family="sans-serif" fill="#111827">Invoice Date: 2026-10-25</text>
    <line x1="50" y1="190" x2="850" y2="190" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="50" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">Item Description</text>
    <text x="300" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">Batch No</text>
    <text x="430" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">Expiry</text>
    <text x="530" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">Qty</text>
    <text x="600" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">Rate</text>
    <text x="680" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">MRP</text>
    <text x="760" y="215" font-size="14" font-weight="bold" font-family="sans-serif" fill="#374151">GST%</text>
    <line x1="50" y1="230" x2="850" y2="230" stroke="#d1d5db" stroke-width="1"/>
    
    <text x="50" y="260" font-size="14" font-family="sans-serif" fill="#111827">PARACETAMOL 650 TAB</text>
    <text x="300" y="260" font-size="14" font-family="sans-serif" fill="#111827">PCM2601</text>
    <text x="430" y="260" font-size="14" font-family="sans-serif" fill="#111827">08/28</text>
    <text x="530" y="260" font-size="14" font-family="sans-serif" fill="#111827">10</text>
    <text x="600" y="260" font-size="14" font-family="sans-serif" fill="#111827">25.50</text>
    <text x="680" y="260" font-size="14" font-family="sans-serif" fill="#111827">35.00</text>
    <text x="760" y="260" font-size="14" font-family="sans-serif" fill="#111827">12%</text>

    <text x="50" y="300" font-size="14" font-family="sans-serif" fill="#111827">AZITHROMYCIN 500 TAB</text>
    <text x="300" y="300" font-size="14" font-family="sans-serif" fill="#111827">AZI509</text>
    <text x="430" y="300" font-size="14" font-family="sans-serif" fill="#111827">11/27</text>
    <text x="530" y="300" font-size="14" font-family="sans-serif" fill="#111827">5</text>
    <text x="600" y="300" font-size="14" font-family="sans-serif" fill="#111827">85.00</text>
    <text x="680" y="300" font-size="14" font-family="sans-serif" fill="#111827">115.00</text>
    <text x="760" y="300" font-size="14" font-family="sans-serif" fill="#111827">12%</text>

    <text x="50" y="340" font-size="14" font-family="sans-serif" fill="#111827">PANTO 40 TAB</text>
    <text x="300" y="340" font-size="14" font-family="sans-serif" fill="#111827">PAN441</text>
    <text x="430" y="340" font-size="14" font-family="sans-serif" fill="#111827">05/28</text>
    <text x="530" y="340" font-size="14" font-family="sans-serif" fill="#111827">20</text>
    <text x="600" y="340" font-size="14" font-family="sans-serif" fill="#111827">60.00</text>
    <text x="680" y="340" font-size="14" font-family="sans-serif" fill="#111827">85.00</text>
    <text x="760" y="340" font-size="14" font-family="sans-serif" fill="#111827">12%</text>

    <line x1="50" y1="380" x2="850" y2="380" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="550" y="420" font-size="16" font-weight="bold" font-family="sans-serif" fill="#111827">Grand Total: ₹ 1880.00</text>
  </svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function runTest() {
  console.log('Generating sample invoice image buffer...');
  const imageBuffer = await createSampleInvoiceImage();

  console.log('Sending invoice image to parseInvoiceImageWithGemini...');
  try {
    const result = await parseInvoiceImageWithGemini(imageBuffer, 'image/jpeg');

    console.log('\n========================================');
    console.log('TEST SCAN RESULT:');
    console.log('========================================');
    console.log(`Supplier Name : ${result.supplierName}`);
    console.log(`Invoice No    : ${result.invoiceNo}`);
    console.log(`Invoice Date  : ${result.invoiceDate}`);
    console.log(`Items Count   : ${result.items ? result.items.length : 0}`);
    console.log('----------------------------------------');
    console.log('First 3 Items :');
    (result.items || []).slice(0, 3).forEach((item, idx) => {
      console.log(`  [${idx + 1}] ${item.name} | Batch: ${item.batchNo} | Exp: ${item.expiryDate} | Qty: ${item.qty} | Rate: ₹${item.purchaseRate} | MRP: ₹${item.mrp}`);
    });
    console.log('========================================');
  } catch (err) {
    console.error('\nScan Test Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

runTest();
