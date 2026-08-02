/**
 * Formats a clean plain-text WhatsApp bill summary message.
 * @param {Object} bill - Sales bill document
 * @param {Object} settings - Business info settings
 * @returns {String} Formatted message
 */
export const buildWhatsAppBillMessage = (bill, settings) => {
  const shopName = settings?.businessName || 'Satkar Medical Store';
  const billNo = bill?.billNo || 'N/A';
  const dateStr = bill?.billDate
    ? new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const items = bill?.items || [];
  let itemsListText = '';

  items.forEach((item, i) => {
    const itemRef = item.itemId || {};
    const name = itemRef.name || 'Medicine/Item';
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const lineTotal = (qty * rate).toFixed(2);
    itemsListText += `${i + 1}. ${name}\n   Qty: ${qty} x ₹${rate.toFixed(2)} = ₹${lineTotal}\n`;
  });

  const totalAmount = Number(bill?.totalAmount || 0).toFixed(2);
  const paymentMode = bill?.paymentMode || 'Cash';
  const customerName = bill?.customerName || 'Valued Customer';

  const message = `🧾 *TAX INVOICE — ${shopName}*
--------------------------------
*Bill No:* ${billNo}
*Date:* ${dateStr}
*Customer:* ${customerName}
*Payment:* ${paymentMode} (Paid)

*ITEMS PURCHASED:*
${itemsListText}--------------------------------
*TOTAL PAYABLE:* ₹${totalAmount}
--------------------------------
Thank you for visiting ${shopName}! Wish you good health. 🙏`;

  return message;
};

/**
 * Builds a wa.me deep link with pre-filled message text.
 * @param {String} phone - Optional customer phone
 * @param {String} message - Plain text message
 * @returns {String} URL string for wa.me
 */
export const getWhatsAppShareLink = (phone, message) => {
  const encodedText = encodeURIComponent(message);
  if (!phone) {
    return `https://wa.me/?text=${encodedText}`;
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }

  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
};
