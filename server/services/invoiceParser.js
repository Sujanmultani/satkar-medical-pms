/**
 * Invoice Parser Heuristics Service
 * Converts raw OCR text output from Google Vision API into structured line items.
 * Optimized for Gujarat & Indian pharmacy distributor invoice formats.
 */

// Configurable Noise Line Patterns (skip header/footer boilerplate & legal disclaimers)
const NOISE_PATTERNS = [
  /subject\s+to.*jurisdiction/i,
  /\b(?:fssai|food\s+lic|dl\s*no|dlno|drug\s+license|pan\s*no|gstin)\b/i,
  /\b(?:tax\s+invoice|sunday\s+closed|invoice\s+no|book\s*no|m\/s:?|lekhaage|t\.c\.no)\b/i,
  /\b(?:ex\.d\/?batch|hsn|description|packing|mrp\/rp|gst\s+base|cgst|sgst|igst|net\s+total|gross|amount\s+in\s+words)\b/i,
  /\b(?:bank|a\/c|ifsc|branch|rtr|mfg|licence|terms\s*&\s*conditions|signature|authorised)\b/i,
  /^(?:total|grand\s+total|subtotal|net\s+amount|page\s+\d+).*$/i,
  /^\d+(?:\.\d+)?\s*(?:only|rs\.?|rupees)?$/i,
  /^(?:six|seven|eight|nine|ten|hundred|thousand|lakh|only|\s)+$/i, // Amount in words lines
];

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

// Check if a line is noise / header / footer boilerplate
function isNoiseLine(line) {
  if (!line || line.trim().length < 3) return true;

  const trimmed = line.trim();

  // Match against configured noise patterns
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Header table detection (contains 2 or more table headers)
  const lower = trimmed.toLowerCase();
  const headerKeywords = ['batch', 'hsn', 'description', 'packing', 'mrp', 'rate', 'gst', 'qty', 'exp'];
  const matchCount = headerKeywords.filter((k) => lower.includes(k)).length;
  if (matchCount >= 3) return true;

  return false;
}

// Extract header metadata (Supplier Name, Invoice No, Invoice Date)
function extractHeaderData(lines) {
  let supplierName = '';
  let invoiceNo = '';
  let invoiceDate = null;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    // Skip buyer lines ("M/S: SATKAR MEDICAL")
    if (lower.startsWith('m/s:') || lower.includes('satkar')) {
      continue;
    }

    if (
      !supplierName &&
      line.length > 3 &&
      !lower.includes('invoice') &&
      !lower.includes('tax') &&
      !lower.includes('gstin') &&
      !lower.includes('subject to') &&
      !lower.includes('fssai')
    ) {
      if (
        lower.includes('pharma') ||
        lower.includes('distribut') ||
        lower.includes('agenc') ||
        lower.includes('ltd') ||
        lower.includes('store') ||
        lower.includes('medical') ||
        lower.includes('trader') ||
        i < 3
      ) {
        supplierName = line.replace(/^M\/S:?\s*/i, '').trim();
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

  // Regex patterns
  const bareExpiryStartRegex = /^\s*(?:EX\.?\s*D\.?\/?)?\s*(0[1-9]|1[0-2])[/.-](\d{2}|\d{4})\b/i;
  const genericExpRegex = /\b(0[1-9]|1[0-2])[/.-](20\d{2}|\d{2})\b/;
  const batchRegex = /\b(?:B\.?No\.?|Batch|B\/N|LOT)[\s.:]*([A-Z0-9-]+)\b/i;
  const expRegex = /\b(?:Exp\.?|Expiry|EXP)[\s.:]*(\d{1,2}[/.-]\d{2,4})\b/i;
  const compositionInParensRegex = /\(([^)]+)\)/;
  const percentGstRegex = /\b(\d+(?:\.\d+)?)\s*%\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Step 1: Skip noise lines
    if (isNoiseLine(line)) {
      continue;
    }

    let expiryDate = null;
    let batchNo = null;
    let hsnCode = null;
    let cleanName = '';
    let qty = 1;
    let purchaseRate = 0;
    let mrp = 0;
    let gstPercent = 12;
    let composition = null;

    // Check for composition in parentheses if present
    const compMatch = line.match(compositionInParensRegex);
    if (compMatch) {
      composition = compMatch[1].trim();
    }

    // Check for GST % token
    const gstMatch = line.match(percentGstRegex);
    if (gstMatch) {
      gstPercent = Number(gstMatch[1]) || 12;
    }

    // =========================================================================
    // CASE A: Line starts with unlabeled Expiry MM/YY (Dominant pharma invoice format)
    // E.g. "06/27 BRND01 30042020 IMOXCL CLAV 500 TAB 1 1 10TAB 299.80 228.42 0.00 6.9% 221.57 232.65"
    // =========================================================================
    const expiryStartMatch = line.match(bareExpiryStartRegex);

    if (expiryStartMatch) {
      expiryDate = parseExpiryDate(expiryStartMatch[0]);

      // Split line into whitespace-separated tokens
      const tokens = line.split(/\s+/);
      let nextIdx = 1; // Index 0 was the expiry date token

      // Token 1: Batch No (alphanumeric code like BRND01, D1362107, CA1S15, 1TX2501)
      if (tokens[nextIdx] && /^[A-Z0-9-]{3,18}$/i.test(tokens[nextIdx])) {
        batchNo = tokens[nextIdx];
        nextIdx++;
      }

      // Token 2: HSN Code (numeric 4-8 digits or alphanumeric HSN code)
      if (tokens[nextIdx] && /^[A-Z0-9]{4,16}$/i.test(tokens[nextIdx]) && /\d/.test(tokens[nextIdx])) {
        hsnCode = tokens[nextIdx];
        nextIdx++;
      }

      // Collect tokens for Item Description until numeric price/qty values begin
      const nameTokens = [];
      const numericTokens = [];

      for (let k = nextIdx; k < tokens.length; k++) {
        const tok = tokens[k];
        // If token is a pure number or decimal or percentage or pack-size like "10TAB" / "100ML"
        if (/^\d+(?:\.\d+)?%?$/.test(tok) || /^\d+(?:TAB|ML|CAP|GM|KG|PCS|STRIP|PACK)$/i.test(tok)) {
          numericTokens.push(tok);
        } else {
          nameTokens.push(tok);
        }
      }

      cleanName = nameTokens.join(' ').replace(compositionInParensRegex, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();

      // Extract numeric fields (qty, rates, mrp)
      const numMatches = line.match(/\d+(?:\.\d+)?/g) || [];
      const numbers = numMatches.map(Number).filter((n) => !isNaN(n));

      // Filter decimal rates/prices (excluding HSN code if it was numeric)
      const prices = numbers.filter((n) => n > 5 && n !== Number(hsnCode));
      if (prices.length >= 2) {
        mrp = Math.max(...prices);
        purchaseRate = Math.min(...prices);
      } else if (prices.length === 1) {
        mrp = prices[0];
        purchaseRate = Math.round(prices[0] * 0.8 * 100) / 100;
      }

      // Extract quantity (first small integer <= 500)
      const qtyCandidate = numbers.find((n) => Number.isInteger(n) && n >= 1 && n <= 500 && n !== Number(hsnCode));
      if (qtyCandidate) {
        qty = qtyCandidate;
      }
    } else {
      // =========================================================================
      // CASE B: Fallback parsing for labeled or standard line formats
      // =========================================================================
      const hasWords = /[a-zA-Z]{3,}/.test(line);
      const hasNumbers = /\d+/.test(line);

      if (!hasWords || !hasNumbers) {
        continue;
      }

      // Extract expiry date anywhere in line
      const expMatch = line.match(expRegex) || line.match(genericExpRegex);
      if (expMatch) {
        expiryDate = parseExpiryDate(expMatch[1] || expMatch[0]);
      }

      // Extract batch number
      const batchMatch = line.match(batchRegex);
      if (batchMatch) {
        batchNo = batchMatch[1].trim();
      } else {
        const tokens = line.split(/\s+/);
        for (const token of tokens) {
          if (/^[A-Z]{1,3}\d{3,8}$/.test(token) || /^[A-Z0-9]{2,4}-\d{3,6}$/.test(token)) {
            batchNo = token;
            break;
          }
        }
      }

      // Extract numeric values
      const numMatches = line.match(/\d+(?:\.\d{1,2})?/g) || [];
      if (numMatches.length > 0) {
        const nums = numMatches.map(Number);
        const integers = nums.filter((n) => Number.isInteger(n) && n > 0 && n <= 1000);
        if (integers.length > 0) {
          qty = integers[0];
        }

        const prices = nums.filter((n) => !Number.isInteger(n) || n > 10);
        if (prices.length >= 2) {
          purchaseRate = Math.min(...prices);
          mrp = Math.max(...prices);
        } else if (prices.length === 1) {
          purchaseRate = prices[0];
          mrp = Math.round(prices[0] * 1.2 * 100) / 100;
        }
      }

      // Clean item name
      cleanName = line
        .replace(compositionInParensRegex, '')
        .replace(batchRegex, '')
        .replace(expRegex, '')
        .replace(genericExpRegex, '')
        .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim();
    }

    // Collapse multi-spaces
    cleanName = cleanName.replace(/\s+/g, ' ');

    // Item Validation & Confidence Check
    if (cleanName.length >= 3) {
      const hasNumericContext = purchaseRate > 0 || mrp > 0 || qty > 0;
      const hasBatchOrExp = Boolean(batchNo || expiryDate);

      // Only accept line if it has batch/exp or numeric price/qty context
      if (hasNumericContext || hasBatchOrExp) {
        const isHighConfidence = Boolean(cleanName && batchNo && expiryDate && (purchaseRate > 0 || mrp > 0));

        items.push({
          name: cleanName,
          composition: composition || '',
          batchNo: batchNo || `B-${Date.now().toString().slice(-4)}`,
          expiryDate: expiryDate || null,
          qty: qty || 1,
          purchaseRate: purchaseRate || 0,
          mrp: mrp || 0,
          gstPercent: gstPercent || 12,
          confidence: isHighConfidence ? 'high' : 'low',
        });
      }
    }
  }

  return {
    supplierName: supplierName || 'Pharma Distributor',
    invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
    items,
  };
}

module.exports = {
  parseInvoiceText,
  parseExpiryDate,
};
