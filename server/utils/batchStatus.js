/**
 * Computes batch status dynamically based on expiryDate:
 * - 'expired': past expiry date (diffDays < 0)
 * - 'expiring_soon': expires within 30 days (0 <= diffDays <= 30)
 * - 'active': expires after 30 days
 */
const computeBatchStatus = (expiryDate) => {
  if (!expiryDate) return 'active';
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'active';
};

module.exports = { computeBatchStatus };
