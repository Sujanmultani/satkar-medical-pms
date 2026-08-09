import html2canvas from 'html2canvas';

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

/**
 * Renders a DOM element to a high-resolution PNG image Blob.
 * @param {HTMLElement} element - The DOM node to render
 * @param {String} billNo - Bill number for filename
 * @returns {Promise<{ blob: Blob, filename: String }>}
 */
export const generateBillImageBlob = async (element, billNo = 'INV') => {
  if (!element) throw new Error('DOM element is required to generate bill image');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        return reject(new Error('Failed to convert bill canvas to PNG image blob'));
      }
      const safeBillNo = String(billNo).replace(/[/\\?%*:|"<>]/g, '_');
      resolve({
        blob,
        filename: `Bill-${safeBillNo}.png`,
      });
    }, 'image/png');
  });
};

/**
 * Formats a WhatsApp message that links to the hosted digital purchase invoice
 * (same style as the customer bill share link).
 * @param {Object} invoice - Invoice document
 * @param {String} shareUrl - Public shareable URL for this invoice
 * @returns {String} Formatted message
 */
export const buildWhatsAppInvoiceLinkMessage = (invoice, shareUrl) => {
  const supplierName = invoice?.supplierName || 'Supplier';
  const invoiceNo = invoice?.invoiceNo || 'N/A';
  const total = Number(invoice?.totalAmount || 0).toFixed(2);

  return `📦 *PURCHASE INVOICE — Satkar Medical*
Invoice No: ${invoiceNo}
Supplier: ${supplierName}
Total Amount: ₹${total}

🔗 *View the digital purchase invoice here:*
${shareUrl}

Scanned & saved via Satkar Inventory System.`;
};

/**
 * Formats a clean plain-text WhatsApp message for a scanned/saved purchase invoice.
 * @param {Object} invoice - Invoice document (from confirmInvoice response or search results)
 * @returns {String} Formatted message
 */
export const buildWhatsAppInvoiceMessage = (invoice) => {
  const supplierName = invoice?.supplierName || 'Supplier';
  const invoiceNo = invoice?.invoiceNo || 'N/A';
  const dateStr = invoice?.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const items = invoice?.items || [];
  let itemsListText = '';

  items.forEach((itemEntry, i) => {
    const ext = itemEntry.extractedData || {};
    const batch = itemEntry.batch || {};
    const liveItem = batch.itemId || {};

    const name = liveItem.name || ext.name || 'Item';
    const qty = Number(ext.qty) || 0;
    const rate = Number(batch.purchaseRate !== undefined ? batch.purchaseRate : ext.purchaseRate) || 0;
    const lineTotal = (qty * rate).toFixed(2);
    itemsListText += `${i + 1}. ${name}\n   Qty: ${qty} x ₹${rate.toFixed(2)} = ₹${lineTotal}\n`;
  });

  const totalAmount = Number(invoice?.totalAmount || 0).toFixed(2);

  const message = `📦 *PURCHASE INVOICE — Satkar*
--------------------------------
*Invoice No:* ${invoiceNo}
*Supplier:* ${supplierName}
*Date:* ${dateStr}

*ITEMS RECEIVED:*
${itemsListText}--------------------------------
*TOTAL AMOUNT:* ₹${totalAmount}
--------------------------------
Scanned & saved via Satkar Inventory System.`;

  return message;
};
