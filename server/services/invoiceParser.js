/**
 * Invoice Parser Heuristics Service
 * Converts raw OCR text output from Google Vision API into structured line items.
 */

// Helper to convert MM/YY or MM/YYYY or DD/MM/YYYY string to ISO Date string
function parseExpiryDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/[^0-9/.-]/g, '').trim();

  // Pattern MM/YY or MM-YY or MM.YY
  const mmyyMatch = cleaned.match(/^(\d{1,2})[/.-](\d{2})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    const year = 2000 + parseInt(mmyyMatch[2], 10);
    if (month >= 1 && month <= 12) {
      // Set to last day of that month
      const date = new Date(year, month, 0);
      return date.toISOString().split('T')[0];
    }
  }

  // Pattern MM/YYYY
  const mmyyyyMatch = cleaned.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (mmyyyyMatch) {
    const month = parseInt(mmyyyyMatch[1], 10);
    const year = parseInt(mmyyyyMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const date = new Date(year, month, 0);
      return date.toISOString().split('T')[0];
    }
  }

  // Pattern DD/MM/YYYY or DD/MM/YY
  const ddmmyyMatch = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (ddmmyyMatch) {
    const day = parseInt(ddmmyyMatch[1], 10);
    const month = parseInt(ddmmyyMatch[2], 10) - 1;
    let year = parseInt(ddmmyyMatch[3], 10);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return null;
}

// Extract header metadata (Supplier Name, Invoice No, Invoice Date)
function extractHeaderData(lines) {
  let supplierName = '';
  let invoiceNo = '';
  let invoiceDate = null;

  // Supplier Heuristics: check top 8 lines
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].trim();
    if (
      !supplierName &&
      line.length > 3 &&
      !line.toLowerCase().includes('invoice') &&
      !line.toLowerCase().includes('tax') &&
      !line.toLowerCase().includes('gstin')
    ) {
      if (
        line.toLowerCase().includes('pharma') ||
        line.toLowerCase().includes('distribut') ||
        line.toLowerCase().includes('agenc') ||
        line.toLowerCase().includes('ltd') ||
        line.toLowerCase().includes('store') ||
        line.toLowerCase().includes('medical') ||
        line.toLowerCase().includes('trader') ||
        i < 3 // fallback to first prominent line
      ) {
        supplierName = line;
      }
    }

    // Invoice No Heuristics
    const invNoMatch = line.match(/(?:inv|invoice|bill|ref)\s*(?:no|num|#)?[\s.:]*([A-Z0-9/-]{3,20})/i);
    if (invNoMatch && !invoiceNo) {
      invoiceNo = invNoMatch[1].trim();
    }

    // Invoice Date Heuristics
    const dateMatch = line.match(/(?:date|dt)[\s.:]*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
    if (dateMatch && !invoiceDate) {
      invoiceDate = parseExpiryDate(dateMatch[1]);
    }
  }

  return { supplierName, invoiceNo, invoiceDate };
}

/**
 * Main parsing function
 * @param {string} rawText - Raw extracted text string from Vision OCR
 * @returns {Object} Structured data containing header & items
 */
function parseInvoiceText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      supplierName: '',
      invoiceNo: '',
      invoiceDate: null,
      items: [],
    };
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const { supplierName, invoiceNo, invoiceDate } = extractHeaderData(lines);

  const items = [];
  const batchRegex = /\b(?:B\.?No\.?|Batch|B\/N|LOT)[\s.:]*([A-Z0-9-]+)\b/i;
  const expRegex = /\b(?:Exp\.?|Expiry|EXP)[\s.:]*(\d{1,2}[/.-]\d{2,4})\b/i;
  const genericExpRegex = /\b(0[1-9]|1[0-2])[/.-](20\d{2}|\d{2})\b/;
  const gstRegex = /\b(5|12|18|28)\s*%\b/;
  const compositionInParensRegex = /\(([^)]+)\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip obvious header/footer noise lines
    const lower = line.toLowerCase();
    if (
      lower.includes('subtotal') ||
      lower.includes('total amount') ||
      lower.includes('thank you') ||
      lower.includes('terms & conditions') ||
      lower.includes('signature') ||
      lower.includes('page 1') ||
      lower.includes('gstin:') ||
      lower.includes('dl no:')
    ) {
      continue;
    }

    // Check if line looks like a product item line
    // Must contain letters (item name) and numbers (price/qty/batch/expiry)
    const hasWords = /[a-zA-Z]{3,}/.test(line);
    const hasNumbers = /\d+/.test(line);

    if (hasWords && hasNumbers) {
      // Extract composition if in parentheses
      let composition = null;
      const compMatch = line.match(compositionInParensRegex);
      if (compMatch) {
        composition = compMatch[1].trim();
      }

      // Extract batch number
      let batchNo = null;
      const batchMatch = line.match(batchRegex);
      if (batchMatch) {
        batchNo = batchMatch[1].trim();
      } else {
        // Try fallback token match (alphanumeric like B2026, BT-102)
        const tokens = line.split(/\s+/);
        for (const token of tokens) {
          if (/^[A-Z]{1,3}\d{3,8}$/.test(token) || /^[A-Z0-9]{2,4}-\d{3,6}$/.test(token)) {
            batchNo = token;
            break;
          }
        }
      }

      // Extract expiry date
      let expiryDate = null;
      const expMatch = line.match(expRegex) || line.match(genericExpRegex);
      if (expMatch) {
        expiryDate = parseExpiryDate(expMatch[1] || expMatch[0]);
      }

      // Extract numbers (qty, rates, mrp, gst)
      const numMatches = line.match(/\d+(?:\.\d{1,2})?/g);
      let qty = null;
      let purchaseRate = null;
      let mrp = null;
      let gstPercent = 12;

      if (numMatches && numMatches.length > 0) {
        const nums = numMatches.map(Number);
        
        // Check for GST %
        const gstMatch = line.match(gstRegex);
        if (gstMatch) {
          gstPercent = Number(gstMatch[1]);
        }

        // Heuristics for qty, rate, mrp
        // Integer numbers usually represent Qty
        const integers = nums.filter((n) => Number.isInteger(n) && n > 0 && n <= 10000);
        if (integers.length > 0) {
          qty = integers[0];
        }

        // Decimals/prices
        const prices = nums.filter((n) => !Number.isInteger(n) || n > 10);
        if (prices.length >= 2) {
          purchaseRate = Math.min(...prices);
          mrp = Math.max(...prices);
        } else if (prices.length === 1) {
          purchaseRate = prices[0];
          mrp = Math.round(prices[0] * 1.2 * 100) / 100;
        }
      }

      // Extract cleaned Item Name
      let cleanName = line
        .replace(compositionInParensRegex, '')
        .replace(batchRegex, '')
        .replace(expRegex, '')
        .replace(genericExpRegex, '')
        .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim();

      // Collapse multiple spaces
      cleanName = cleanName.replace(/\s+/g, ' ');

      if (cleanName.length >= 3 && !/^(total|subtotal|tax|discount|invoice|date|gst|sgst|cgst)$/i.test(cleanName)) {
        // Confidence calculation
        const isHighConfidence = Boolean(cleanName && batchNo && expiryDate && (qty || purchaseRate));

        items.push({
          name: cleanName,
          composition: composition,
          batchNo: batchNo || `B-${Date.now().toString().slice(-4)}`,
          expiryDate: expiryDate || null,
          qty: qty || 10,
          purchaseRate: purchaseRate || 0,
          mrp: mrp || 0,
          gstPercent: gstPercent || 12,
          confidence: isHighConfidence ? 'high' : 'low',
        });
      }
    }
  }

  return {
    supplierName: supplierName || 'Sample Distributor',
    invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
    items,
  };
}

module.exports = {
  parseInvoiceText,
  parseExpiryDate,
};
