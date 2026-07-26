const { computeBatchStatus } = require('../server/utils/batchStatus');

const runTests = () => {
  const today = new Date();

  // Test Case 1: Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const statusYesterday = computeBatchStatus(yesterday);

  // Test Case 2: Today
  const statusToday = computeBatchStatus(today);

  // Test Case 3: In 15 days
  const in15Days = new Date(today);
  in15Days.setDate(today.getDate() + 15);
  const status15Days = computeBatchStatus(in15Days);

  // Test Case 4: In 45 days
  const in45Days = new Date(today);
  in45Days.setDate(today.getDate() + 45);
  const status45Days = computeBatchStatus(in45Days);

  console.log('--- Batch Expiry Transition Empirical Test Results ---');
  console.log(`Yesterday (${yesterday.toISOString().split('T')[0]}): ${statusYesterday} (Expected: expired)`);
  console.log(`Today (${today.toISOString().split('T')[0]}): ${statusToday} (Expected: expiring_soon)`);
  console.log(`In 15 Days (${in15Days.toISOString().split('T')[0]}): ${status15Days} (Expected: expiring_soon)`);
  console.log(`In 45 Days (${in45Days.toISOString().split('T')[0]}): ${status45Days} (Expected: active)`);

  const passed =
    statusYesterday === 'expired' &&
    statusToday === 'expiring_soon' &&
    status15Days === 'expiring_soon' &&
    status45Days === 'active';

  console.log(`\nTest Verification Outcome: ${passed ? 'ALL PASSED' : 'FAILED'}`);
  if (!passed) process.exit(1);
};

runTests();
