const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db.js');
const Item = require('../models/Item.js');
const Batch = require('../models/Batch.js');
const Bill = require('../models/Bill.js');
const Return = require('../models/Return.js');
const Supplier = require('../models/Supplier.js');
const { computeBatchStatus } = require('../utils/batchStatus.js');
const { findOrCreateSupplier } = require('../services/supplierService.js');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB database...');
    await connectDB();

    const resetMode = process.argv.includes('--reset');
    if (resetMode) {
      console.log('[Seed] Reset flag detected. Clearing Item, Batch, Bill, Return, and Supplier collections...');
      await Item.deleteMany({});
      await Batch.deleteMany({});
      await Bill.deleteMany({});
      await Return.deleteMany({});
      await Supplier.deleteMany({});
      console.log('[Seed] Existing transactional & inventory data cleared cleanly.');
    }

    const now = new Date();

    // Helper to generate dates relative to today
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const daysAhead = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // ==========================================
    // 0. SEED SUPPLIERS
    // ==========================================
    console.log('[Seed] Creating sample Suppliers...');
    const sup1 = await findOrCreateSupplier({ name: 'Cipla Pharma Distributors', phone: '9825011223', address: 'Station Road, Bharuch' });
    const sup2 = await findOrCreateSupplier({ name: 'Sun Pharma Agencies', phone: '9898033445', address: 'GIDC Industrial Estate, Ankleshwar' });
    const sup3 = await findOrCreateSupplier({ name: 'Apex Medical Supplies', phone: '9712055667', address: 'Main Bazaar, Jambusar' });

    // ==========================================
    // 1. MEDICAL STORE ITEMS & BATCHES (~18 items)
    // ==========================================
    console.log('[Seed] Creating Medical Store items and batches...');

    const medicalItemsData = [
      // Paracetamol 500mg Group (Alternatives testing)
      { name: 'Dolo 650 Tablet', composition: 'Paracetamol 650mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Crocin 650 Tablet', composition: 'Paracetamol 650mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Calpol 650 Tablet', composition: 'Paracetamol 650mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Pacimol 650 Tablet', composition: 'Paracetamol 650mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },

      // Azithromycin 500mg Group (Alternatives testing)
      { name: 'Azee 500 Tablet', composition: 'Azithromycin 500mg', category: 'Tablet', unit: 'Strip of 5 Tablets', hsnCode: '30042010', storeType: 'medical' },
      { name: 'Azithral 500 Tablet', composition: 'Azithromycin 500mg', category: 'Tablet', unit: 'Strip of 5 Tablets', hsnCode: '30042010', storeType: 'medical' },
      { name: 'Zady 500 Tablet', composition: 'Azithromycin 500mg', category: 'Tablet', unit: 'Strip of 3 Tablets', hsnCode: '30042010', storeType: 'medical' },

      // Amoxicillin Clavulanate Group
      { name: 'Augmentin 625 Duo Tablet', composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg', category: 'Tablet', unit: 'Strip of 10 Tablets', hsnCode: '30041010', storeType: 'medical' },
      { name: 'Moxikind-CV 625 Tablet', composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg', category: 'Tablet', unit: 'Strip of 10 Tablets', hsnCode: '30041010', storeType: 'medical' },

      // Pantoprazole Group
      { name: 'Pan 40 Tablet', composition: 'Pantoprazole 40mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Pantocid 40 Tablet', composition: 'Pantoprazole 40mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },

      // Cetirizine Group
      { name: 'Cetzine 10mg Tablet', composition: 'Cetirizine Hydrochloride 10mg', category: 'Tablet', unit: 'Strip of 10 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Okacet 10mg Tablet', composition: 'Cetirizine Hydrochloride 10mg', category: 'Tablet', unit: 'Strip of 10 Tablets', hsnCode: '30049099', storeType: 'medical' },

      // Metformin & Cardiovascular
      { name: 'Glycomet 500 Tablet', composition: 'Metformin Hydrochloride 500mg', category: 'Tablet', unit: 'Strip of 20 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Atorva 10 Tablet', composition: 'Atorvastatin 10mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Telma 40 Tablet', composition: 'Telmisartan 40mg', category: 'Tablet', unit: 'Strip of 15 Tablets', hsnCode: '30049099', storeType: 'medical' },

      // Syrups & Injections
      { name: 'Benadryl Cough Syrup 100ml', composition: 'Diphenhydramine + Ammonium Chloride', category: 'Syrup', unit: 'Bottle of 100ml', hsnCode: '30049099', storeType: 'medical' },
      { name: 'Monocef 1g Injection', composition: 'Ceftriaxone 1000mg', category: 'Injection', unit: 'Vial', hsnCode: '30042010', storeType: 'medical' },
    ];

    const createdMedicalItems = await Item.insertMany(medicalItemsData);

    const medicalBatchesSeed = [
      // Dolo 650 (Normal + Expiring soon)
      { itemId: createdMedicalItems[0]._id, supplierId: sup1._id, batchNo: 'DL-2401', mfgDate: daysAgo(300), expiryDate: daysAhead(400), qty: 120, purchaseRate: 24.5, mrp: 34.0, gstPercent: 12 },
      { itemId: createdMedicalItems[0]._id, supplierId: sup1._id, batchNo: 'DL-2309', mfgDate: daysAgo(360), expiryDate: daysAhead(14), qty: 25, purchaseRate: 22.0, mrp: 32.0, gstPercent: 12 },

      // Crocin 650 (Normal)
      { itemId: createdMedicalItems[1]._id, supplierId: sup2._id, batchNo: 'CR-9081', mfgDate: daysAgo(200), expiryDate: daysAhead(300), qty: 95, purchaseRate: 26.0, mrp: 35.5, gstPercent: 12 },

      // Calpol 650 (Expired + Normal)
      { itemId: createdMedicalItems[2]._id, supplierId: sup1._id, batchNo: 'CP-1102', mfgDate: daysAgo(500), expiryDate: daysAgo(40), qty: 40, purchaseRate: 21.0, mrp: 30.0, gstPercent: 12 },
      { itemId: createdMedicalItems[2]._id, supplierId: sup1._id, batchNo: 'CP-1405', mfgDate: daysAgo(120), expiryDate: daysAhead(500), qty: 110, purchaseRate: 23.0, mrp: 33.0, gstPercent: 12 },

      // Pacimol 650
      { itemId: createdMedicalItems[3]._id, supplierId: sup3._id, batchNo: 'PC-7712', mfgDate: daysAgo(180), expiryDate: daysAhead(320), qty: 60, purchaseRate: 20.0, mrp: 28.0, gstPercent: 12 },

      // Azee 500 (Normal + Expiring soon)
      { itemId: createdMedicalItems[4]._id, supplierId: sup1._id, batchNo: 'AZ-4011', mfgDate: daysAgo(150), expiryDate: daysAhead(350), qty: 85, purchaseRate: 95.0, mrp: 120.0, gstPercent: 12 },
      { itemId: createdMedicalItems[4]._id, supplierId: sup1._id, batchNo: 'AZ-3088', mfgDate: daysAgo(340), expiryDate: daysAhead(22), qty: 18, purchaseRate: 90.0, mrp: 115.0, gstPercent: 12 },

      // Azithral 500
      { itemId: createdMedicalItems[5]._id, supplierId: sup2._id, batchNo: 'AZT-992', mfgDate: daysAgo(100), expiryDate: daysAhead(450), qty: 70, purchaseRate: 98.0, mrp: 125.0, gstPercent: 12 },

      // Zady 500
      { itemId: createdMedicalItems[6]._id, supplierId: sup3._id, batchNo: 'ZD-501', mfgDate: daysAgo(90), expiryDate: daysAhead(280), qty: 50, purchaseRate: 60.0, mrp: 78.0, gstPercent: 12 },

      // Augmentin 625 Duo (Normal)
      { itemId: createdMedicalItems[7]._id, supplierId: sup3._id, batchNo: 'AUG-881', mfgDate: daysAgo(80), expiryDate: daysAhead(380), qty: 65, purchaseRate: 150.0, mrp: 205.0, gstPercent: 18 },

      // Moxikind-CV 625 (Normal)
      { itemId: createdMedicalItems[8]._id, supplierId: sup2._id, batchNo: 'MX-1029', mfgDate: daysAgo(110), expiryDate: daysAhead(300), qty: 80, purchaseRate: 130.0, mrp: 175.0, gstPercent: 18 },

      // Pan 40 (Expired + Normal)
      { itemId: createdMedicalItems[9]._id, supplierId: sup2._id, batchNo: 'PN-0021', mfgDate: daysAgo(480), expiryDate: daysAgo(25), qty: 35, purchaseRate: 110.0, mrp: 155.0, gstPercent: 12 },
      { itemId: createdMedicalItems[9]._id, supplierId: sup2._id, batchNo: 'PN-1102', mfgDate: daysAgo(60), expiryDate: daysAhead(420), qty: 140, purchaseRate: 115.0, mrp: 160.0, gstPercent: 12 },

      // Pantocid 40
      { itemId: createdMedicalItems[10]._id, supplierId: sup3._id, batchNo: 'PNC-701', mfgDate: daysAgo(140), expiryDate: daysAhead(260), qty: 90, purchaseRate: 120.0, mrp: 165.0, gstPercent: 12 },

      // Cetzine 10mg
      { itemId: createdMedicalItems[11]._id, supplierId: sup1._id, batchNo: 'CT-3301', mfgDate: daysAgo(210), expiryDate: daysAhead(180), qty: 150, purchaseRate: 18.0, mrp: 26.0, gstPercent: 12 },

      // Okacet 10mg
      { itemId: createdMedicalItems[12]._id, supplierId: sup2._id, batchNo: 'OK-9011', mfgDate: daysAgo(190), expiryDate: daysAhead(210), qty: 110, purchaseRate: 16.5, mrp: 24.0, gstPercent: 12 },

      // Glycomet 500
      { itemId: createdMedicalItems[13]._id, supplierId: sup3._id, batchNo: 'GL-8812', mfgDate: daysAgo(130), expiryDate: daysAhead(360), qty: 130, purchaseRate: 28.0, mrp: 42.0, gstPercent: 12 },

      // Atorva 10 (Expiring Soon)
      { itemId: createdMedicalItems[14]._id, supplierId: sup1._id, batchNo: 'ATV-441', mfgDate: daysAgo(350), expiryDate: daysAhead(8), qty: 22, purchaseRate: 65.0, mrp: 92.0, gstPercent: 12 },

      // Telma 40
      { itemId: createdMedicalItems[15]._id, supplierId: sup2._id, batchNo: 'TL-1092', mfgDate: daysAgo(95), expiryDate: daysAhead(400), qty: 85, purchaseRate: 72.0, mrp: 108.0, gstPercent: 12 },

      // Benadryl Syrup
      { itemId: createdMedicalItems[16]._id, supplierId: sup1._id, batchNo: 'BND-661', mfgDate: daysAgo(160), expiryDate: daysAhead(220), qty: 45, purchaseRate: 85.0, mrp: 118.0, gstPercent: 12 },

      // Monocef 1g Injection
      { itemId: createdMedicalItems[17]._id, supplierId: sup3._id, batchNo: 'MN-5501', mfgDate: daysAgo(70), expiryDate: daysAhead(480), qty: 40, purchaseRate: 48.0, mrp: 68.0, gstPercent: 12 },
    ];

    const medicalBatchesWithStatus = medicalBatchesSeed.map((b) => ({
      ...b,
      status: computeBatchStatus(b.expiryDate),
    }));

    const createdMedicalBatches = await Batch.insertMany(medicalBatchesWithStatus);

    // ==========================================
    // 2. PROVISION STORE ITEMS & BATCHES (~8 items)
    // ==========================================
    console.log('[Seed] Creating Provision Store items and batches...');

    const provisionItemsData = [
      { name: 'Fortune Sunlite Sunflower Oil 1L', composition: '', category: 'Cooking Oil', unit: 'Pouch 1L', hsnCode: '1512', storeType: 'provision' },
      { name: 'Aashirvaad Whole Wheat Atta 5kg', composition: '', category: 'Flour & Grains', unit: 'Bag 5kg', hsnCode: '1101', storeType: 'provision' },
      { name: 'Tata Salt Vacuum Evaporated 1kg', composition: '', category: 'Salt & Spices', unit: 'Packet 1kg', hsnCode: '2501', storeType: 'provision' },
      { name: 'Daawat Rozana Basmati Rice 5kg', composition: '', category: 'Rice', unit: 'Bag 5kg', hsnCode: '1006', storeType: 'provision' },
      { name: 'Dettol Original Liquid Handwash 200ml', composition: '', category: 'Personal Care', unit: 'Bottle 200ml', hsnCode: '3401', storeType: 'provision' },
      { name: 'Surf Excel Easy Wash Powder 1kg', composition: '', category: 'Detergent', unit: 'Packet 1kg', hsnCode: '3402', storeType: 'provision' },
      { name: 'Amul Pasteurised Butter 500g', composition: '', category: 'Dairy', unit: 'Pack 500g', hsnCode: '0405', storeType: 'provision' },
      { name: 'Cadbury Dairy Milk Silk 150g', composition: '', category: 'Chocolates', unit: 'Pack 150g', hsnCode: '1806', storeType: 'provision' },
    ];

    const createdProvisionItems = await Item.insertMany(provisionItemsData);

    const provisionBatchesSeed = [
      { itemId: createdProvisionItems[0]._id, batchNo: 'FR-8801', mfgDate: daysAgo(60), expiryDate: daysAhead(180), qty: 50, purchaseRate: 110.0, mrp: 135.0, gstPercent: 5 },
      { itemId: createdProvisionItems[1]._id, batchNo: 'ASH-102', mfgDate: daysAgo(30), expiryDate: daysAhead(90), qty: 40, purchaseRate: 210.0, mrp: 245.0, gstPercent: 0 },
      { itemId: createdProvisionItems[2]._id, batchNo: 'TT-7710', mfgDate: daysAgo(90), expiryDate: daysAhead(720), qty: 100, purchaseRate: 20.0, mrp: 28.0, gstPercent: 0 },
      { itemId: createdProvisionItems[3]._id, batchNo: 'DWT-401', mfgDate: daysAgo(45), expiryDate: daysAhead(360), qty: 30, purchaseRate: 380.0, mrp: 460.0, gstPercent: 5 },
      { itemId: createdProvisionItems[4]._id, batchNo: 'DT-9902', mfgDate: daysAgo(100), expiryDate: daysAhead(500), qty: 60, purchaseRate: 75.0, mrp: 99.0, gstPercent: 18 },
      { itemId: createdProvisionItems[5]._id, batchNo: 'SE-5512', mfgDate: daysAgo(75), expiryDate: daysAhead(600), qty: 45, purchaseRate: 115.0, mrp: 145.0, gstPercent: 18 },
      { itemId: createdProvisionItems[6]._id, batchNo: 'AM-2201', mfgDate: daysAgo(20), expiryDate: daysAhead(160), qty: 35, purchaseRate: 235.0, mrp: 275.0, gstPercent: 12 },
      { itemId: createdProvisionItems[7]._id, batchNo: 'CD-8811', mfgDate: daysAgo(40), expiryDate: daysAhead(200), qty: 55, purchaseRate: 140.0, mrp: 175.0, gstPercent: 18 },
    ];

    const provisionBatchesWithStatus = provisionBatchesSeed.map((b) => ({
      ...b,
      status: computeBatchStatus(b.expiryDate),
    }));

    const createdProvisionBatches = await Batch.insertMany(provisionBatchesWithStatus);

    // Combine all batches for easy lookup
    const allBatches = [...createdMedicalBatches, ...createdProvisionBatches];

    // Map batch by batchNo for easy reference
    const getBatch = (no) => allBatches.find((b) => b.batchNo === no);

    // ==========================================
    // 3. SAMPLE BILLS (~4 bills)
    // ==========================================
    console.log('[Seed] Creating sample sales bills...');

    const b1 = getBatch('DL-2401'); // Dolo 650 (MRP 34, GST 12%)
    const b2 = getBatch('AZ-4011'); // Azee 500 (MRP 120, GST 12%)
    const b3 = getBatch('AUG-881'); // Augmentin 625 (MRP 205, GST 18%)
    const b4 = getBatch('PN-1102'); // Pan 40 (MRP 160, GST 12%)
    const b5 = getBatch('FR-8801'); // Fortune Oil (MRP 135, GST 5%)
    const b6 = getBatch('ASH-102'); // Aashirvaad Atta (MRP 245, GST 0%)

    const billsSeed = [
      {
        billNo: `SAT-${now.toISOString().split('T')[0].replace(/-/g, '')}-0001`,
        billDate: now, // Today
        customerName: 'Ramesh Patel',
        customerPhone: '9876543210',
        paymentMode: 'Cash',
        items: [
          { itemId: b1.itemId, batchId: b1._id, qty: 2, rate: b1.mrp, gst: b1.gstPercent },
          { itemId: b2.itemId, batchId: b2._id, qty: 1, rate: b2.mrp, gst: b2.gstPercent },
        ],
        gstBreakdown: { '12%': { cgst: 10.07, sgst: 10.07, totalGst: 20.14 } },
        totalAmount: 2 * 34 + 1 * 120, // 188.00
        shareStatus: { printed: true, whatsapp: false, sms: false },
      },
      {
        billNo: `SAT-${now.toISOString().split('T')[0].replace(/-/g, '')}-0002`,
        billDate: now, // Today
        customerName: 'Sunita Sharma',
        customerPhone: '9812345678',
        paymentMode: 'UPI',
        items: [
          { itemId: b3.itemId, batchId: b3._id, qty: 1, rate: b3.mrp, gst: b3.gstPercent },
          { itemId: b4.itemId, batchId: b4._id, qty: 2, rate: b4.mrp, gst: b4.gstPercent },
        ],
        gstBreakdown: {
          '18%': { cgst: 15.64, sgst: 15.64, totalGst: 31.28 },
          '12%': { cgst: 17.14, sgst: 17.14, totalGst: 34.28 },
        },
        totalAmount: 1 * 205 + 2 * 160, // 525.00
        shareStatus: { printed: true, whatsapp: false, sms: false },
      },
      {
        billNo: `SAT-${daysAgo(1).toISOString().split('T')[0].replace(/-/g, '')}-0003`,
        billDate: daysAgo(1),
        customerName: 'Vijay Shah',
        customerPhone: '9723456789',
        paymentMode: 'Card',
        items: [
          { itemId: b5.itemId, batchId: b5._id, qty: 2, rate: b5.mrp, gst: b5.gstPercent },
          { itemId: b6.itemId, batchId: b6._id, qty: 1, rate: b6.mrp, gst: b6.gstPercent },
        ],
        gstBreakdown: {
          '5%': { cgst: 6.43, sgst: 6.43, totalGst: 12.86 },
          '0%': { cgst: 0, sgst: 0, totalGst: 0 },
        },
        totalAmount: 2 * 135 + 1 * 245, // 515.00
        shareStatus: { printed: false, whatsapp: false, sms: false },
      },
    ];

    const createdBills = await Bill.insertMany(billsSeed);

    // Decrement sold stock quantities in batches for data consistency
    for (const bill of createdBills) {
      for (const line of bill.items) {
        await Batch.findByIdAndUpdate(line.batchId, { $inc: { qty: -line.qty } });
      }
    }

    // ==========================================
    // 4. SAMPLE RETURNS (~2 returns)
    // ==========================================
    console.log('[Seed] Creating sample returns...');

    const expBatch1 = getBatch('CP-1102'); // Expired Calpol batch
    const bill3 = createdBills[2]; // Bill 3 (Vijay Shah)
    const bill3Line = bill3.items[0]; // Fortune Oil

    const returnsSeed = [
      {
        returnNo: `RET-${now.toISOString().split('T')[0].replace(/-/g, '')}-0001`,
        type: 'supplier',
        itemId: expBatch1.itemId,
        batchId: expBatch1._id,
        storeType: 'medical',
        quantity: 15,
        reason: 'expired',
        returnDate: daysAgo(2),
        restocked: false,
        supplierName: sup1.name,
        creditNoteNo: 'CN-2026-8812',
        notes: 'Returned expired stock for credit note adjustment.',
      },
      {
        returnNo: `RET-${now.toISOString().split('T')[0].replace(/-/g, '')}-0002`,
        type: 'customer',
        referenceBillId: bill3._id,
        itemId: bill3Line.itemId,
        batchId: bill3Line.batchId,
        storeType: 'provision',
        quantity: 1,
        reason: 'wrong_item',
        returnDate: daysAgo(1),
        restocked: true,
        customerName: 'Vijay Shah',
        customerPhone: '9723456789',
        refundAmount: 135.0,
        notes: 'Exchanged un-opened pouch.',
      },
    ];

    // Decrement supplier returned batch & increment customer restocked batch
    await Batch.findByIdAndUpdate(expBatch1._id, { $inc: { qty: -15 } });
    await Batch.findByIdAndUpdate(bill3Line.batchId, { $inc: { qty: 1 } });

    await Return.insertMany(returnsSeed);

    // ==========================================
    // SUMMARY REPORT
    // ==========================================
    const totalItemsCount = (await Item.countDocuments());
    const totalBatchesCount = (await Batch.countDocuments());
    const totalBillsCount = (await Bill.countDocuments());
    const totalReturnsCount = (await Return.countDocuments());
    const totalSuppliersCount = (await Supplier.countDocuments());

    console.log('\n=================================================');
    console.log('  SATKAR MEDICAL PMS — MOCK DATA SEED COMPLETE   ');
    console.log('=================================================');
    console.log(`Seeded: ${totalItemsCount} items, ${totalBatchesCount} batches, ${totalBillsCount} bills, ${totalReturnsCount} returns, ${totalSuppliersCount} suppliers. Done.`);
    console.log('=================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed mock data:', error);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
};

seedData();
