/**
 * Invoice Parser Service using Gemini (Vertex AI)
 * Sends invoice images directly to Vertex AI Gemini for multimodal structured JSON extraction.
 */

const { VertexAI } = require('@google-cloud/vertexai');

let vertexAIClient = null;

const getGenerativeModel = () => {
  if (!vertexAIClient) {
    const project = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'satkar-medical-ocr';
    const location = process.env.GCP_LOCATION || 'us-central1';

    vertexAIClient = new VertexAI({ project, location });
  }

  // Use Gemini multimodal model (gemini-2.5-flash)
  const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  return vertexAIClient.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });
};

// Helper to normalize MM/YY, MM/YYYY, or DD/MM/YYYY dates to ISO string (YYYY-MM-DD)
function parseExpiryDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = String(dateStr).replace(/[^0-9/.-]/g, '').trim();

  // Pattern YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Pattern MM/YY or MM-YY or MM.YY
  const mmyyMatch = cleaned.match(/^(\d{1,2})[/.-](\d{2})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    const year = 2000 + parseInt(mmyyMatch[2], 10);
    if (month >= 1 && month <= 12) {
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

const EXTRACTION_PROMPT = `
You are an expert OCR AI specializing in Indian pharmacy distributor invoices (particularly Gujarat pharma agencies).
Analyze the attached invoice image and extract structured JSON data according to these exact rules:

1. INVOICE HEADER:
   - supplierName: Name of the distributor/seller (e.g., "CAMBAY PHARMA AGENCIES", "ASHA MEDICAL AGENCY"). Do NOT extract buyer name.
   - invoiceNo: Invoice/bill reference number (e.g., "INV-1092", "24-25/9981").
   - invoiceDate: Invoice date formatted as YYYY-MM-DD.
   - printedSubtotal: Printed gross subtotal / taxable base amount before round-off or net total (number or null).
   - printedRoundOff: Explicit printed Round Off adjustment figure if printed on invoice (number, e.g. 0.23, -0.15, or null).
   - printedGrandTotal: Printed final Net Amount / Total payable figure for the entire invoice (number or null).

2. LINE ITEMS (Medicines & Products Purchased):
   CRITICAL COMPLETENESS CHECK: Before producing your final JSON output, first visually scan the ENTIRE line-items table region of the invoice from top to bottom and silently count the exact number of distinct product rows present (including rows partially obscured by handwritten tick marks, pen annotations, stamps, or folds — these do not exclude a row, they just make it harder to read). Your "items" array in the output MUST contain exactly that many entries — one per physical row. Never omit a row because it is hard to read; if a specific field on a hard-to-read row is unclear, still include the row and set "confidence": "low" for it rather than dropping it entirely.

   - Extract only genuine product purchase lines.
   - EXCLUDE: Distributor address/phone/license boilerplate, disclaimers, buyer address, table header rows, tax/GST summary rows, and amount-in-words lines.
   - For each real product line, extract:
     - name: Medicine/product brand name (e.g., "IMOXCL CLAV 500 TAB", "ZEDEX COUGH SYP").
     - composition: Set to null (unless salt name is explicitly printed in parentheses on the line).
     - category: Standardized category inferred from product name/packaging. MUST be one of: "Tablet", "Syrup", "Capsule", "Injection", "Insulin", "Ointment", "Drops", "Other".
     - unit: Standardized packaging unit inferred from item name. MUST be one of: "strip", "bottle", "vial", "tube", "pack", "piece".
     - hsnCode: HSN/SAC code if printed (numeric or alphanumeric, e.g. "30049099", "1512", or null).
     - batchNo: Batch alphanumeric code (e.g., "BRND01", "D1362107", "CA1S15", "1TX2501").
     - expiryDate: Expiry date as YYYY-MM-DD (convert bare MM/YY or MM/YYYY to last day of month).
     - qty: Number of packs/units actually billed and purchased on this line (integer, default 1).
     - freeQty: Some invoice lines include a separate 'Free Qty' / 'FQTY' / 'FR.QTY' / 'Free' / 'Scheme Qty' column, representing bonus units supplied at no additional cost, distinct from the billed/paid quantity (which stays in the existing 'qty' field). Extract this as 'freeQty' if present; default to 0 if the invoice has no such column for that line.
     - purchaseRate: The RAW rate per unit EXACTLY AS PRINTED in the invoice's own "Rate" column for this line — the number a human would read directly off the paper, BEFORE any discount or scheme deduction is applied. Do NOT apply any discount adjustment to this number yourself.
     - discPercent: If the invoice shows a discount or scheme percentage column for this line (labeled 'S+C%', 'Disc%', 'INDIS', 'Scheme%', or similar), extract the exact printed percentage value (number). Default to 0 if no such column exists or is blank for this line.
     - ALWAYS ATTEMPT EXTRACTION OF printedLineTotal: If a printed line total (printedLineTotal / TOT.AMT / Line Amount) is visible and legible for a row, extract it. This remains the primary source of truth for the line's total — it is independent of purchaseRate and discPercent above.
     - mrp: Maximum Retail Price per pack (number).
     - gstPercent: Read the EXACT GST/tax percentage printed for THIS SPECIFIC line item (number).
     - printedLineTotal: Printed final line item amount figure if printed on this line (number or null). ALWAYS ATTEMPT TO EXTRACT THIS FIELD FOR EVERY LINE ITEM.
     - confidence: "high" if legible; set to "low" if ambiguous.

3. STRICT DUPLICATE PREVENTION & MERGING RULES:
   - Each physical purchase line item on the invoice must appear EXACTLY ONCE in the JSON output array.
   - Merge lines sharing identical batch number and rate/MRP.

OUTPUT JSON FORMAT (Strict JSON):
{
  "supplierName": "String",
  "invoiceNo": "String",
  "invoiceDate": "YYYY-MM-DD",
  "printedSubtotal": null,
  "printedRoundOff": null,
  "printedGrandTotal": null,
  "items": [
    {
      "name": "String",
      "composition": null,
      "category": "Tablet",
      "unit": "strip",
      "hsnCode": "String",
      "batchNo": "String",
      "expiryDate": "YYYY-MM-DD",
      "qty": 1,
      "freeQty": 0,
      "purchaseRate": 0.0,
      "discPercent": 0.0,
      "mrp": 0.0,
      "gstPercent": null,
      "printedLineTotal": null,
      "confidence": "high"
    }
  ]
}
`;

/**
 * Internal single extraction attempt using Gemini via Vertex AI.
 * @param {Buffer|Array<Object>} inputData - Image buffer or array of { buffer, mimeType }
 * @param {string} mimeType - Image mime type
 * @returns {Promise<Object>} Extracted invoice header & line items
 */
const attemptExtraction = async (inputData, mimeType = 'image/jpeg') => {
  try {
    const generativeModel = getGenerativeModel();

    const pageArray = Array.isArray(inputData)
      ? inputData
      : [{ buffer: inputData, mimeType: mimeType || 'image/jpeg' }];

    const imageParts = pageArray.map((page) => ({
      inlineData: {
        data: page.buffer.toString('base64'),
        mimeType: page.mimeType || 'image/jpeg',
      },
    }));

    const textPart = {
      text: EXTRACTION_PROMPT,
    };

    const response = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [...imageParts, textPart] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });

    const candidate = response?.response?.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error('Gemini API returned an empty response.');
    }

    const parsedData = JSON.parse(textOutput);

    const validCategories = ['Tablet', 'Syrup', 'Capsule', 'Injection', 'Insulin', 'Ointment', 'Drops', 'Other'];
    const validUnits = ['strip', 'bottle', 'vial', 'tube', 'pack', 'piece'];

    // Post-process and normalize fields
    const rawItems = (parsedData.items || []).map((item) => {
      const parsedQty = typeof item.qty === 'number' && !isNaN(item.qty) ? item.qty : parseInt(item.qty, 10);
      const parsedFreeQty = typeof item.freeQty === 'number' && !isNaN(item.freeQty) ? item.freeQty : parseInt(item.freeQty, 10);
      const parsedRate = typeof item.purchaseRate === 'number' && !isNaN(item.purchaseRate) ? item.purchaseRate : parseFloat(item.purchaseRate);
      const parsedDiscPercent = typeof item.discPercent === 'number' && !isNaN(item.discPercent) ? item.discPercent : parseFloat(item.discPercent);
      const parsedMrp = typeof item.mrp === 'number' && !isNaN(item.mrp) ? item.mrp : parseFloat(item.mrp);
      const parsedGst = typeof item.gstPercent === 'number' && !isNaN(item.gstPercent) ? item.gstPercent : parseFloat(item.gstPercent);
      const parsedLineTotal = typeof item.printedLineTotal === 'number' && !isNaN(item.printedLineTotal) ? item.printedLineTotal : parseFloat(item.printedLineTotal);

      return {
        name: item.name ? String(item.name).trim() : 'Unspecified Medicine',
        composition: item.composition ? String(item.composition).trim() : null,
        category: validCategories.includes(item.category) ? item.category : 'Tablet',
        unit: validUnits.includes(item.unit) ? item.unit : 'strip',
        hsnCode: item.hsnCode ? String(item.hsnCode).trim() : null,
        batchNo: item.batchNo ? String(item.batchNo).trim() : 'NO-BATCH',
        expiryDate: parseExpiryDate(item.expiryDate) || item.expiryDate || null,
        qty: !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1,
        freeQty: !isNaN(parsedFreeQty) && parsedFreeQty >= 0 ? parsedFreeQty : 0,
        purchaseRate: !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : 0,
        discPercent: !isNaN(parsedDiscPercent) && parsedDiscPercent >= 0 ? parsedDiscPercent : 0,
        mrp: !isNaN(parsedMrp) && parsedMrp >= 0 ? parsedMrp : 0,
        gstPercent: !isNaN(parsedGst) && parsedGst >= 0 ? parsedGst : 12,
        printedLineTotal: !isNaN(parsedLineTotal) && parsedLineTotal > 0 ? parsedLineTotal : null,
        confidence: item.confidence === 'low' ? 'low' : 'high',
      };
    });

    // Deduplicate/merge items sharing exact same batch and price
    const seenMap = new Map();
    const items = [];

    for (const item of rawItems) {
      const normalizedBatch = item.batchNo ? item.batchNo.trim().toUpperCase() : '';
      const dedupKey = `${item.name.toUpperCase()}_${normalizedBatch}_${item.purchaseRate}_${item.mrp}`;

      if (normalizedBatch && seenMap.has(dedupKey)) {
        const existingIndex = seenMap.get(dedupKey);
        const existing = items[existingIndex];
        existing.qty = Math.max(existing.qty, item.qty);
        existing.mrp = Math.max(existing.mrp, item.mrp);
        existing.confidence = 'low';
      } else {
        if (normalizedBatch) {
          seenMap.set(dedupKey, items.length);
        }
        items.push({ ...item });
      }
    }

    const pSub = typeof parsedData.printedSubtotal === 'number' && !isNaN(parsedData.printedSubtotal) ? parsedData.printedSubtotal : parseFloat(parsedData.printedSubtotal);
    const pRound = typeof parsedData.printedRoundOff === 'number' && !isNaN(parsedData.printedRoundOff) ? parsedData.printedRoundOff : parseFloat(parsedData.printedRoundOff);
    const pGrand = typeof parsedData.printedGrandTotal === 'number' && !isNaN(parsedData.printedGrandTotal) ? parsedData.printedGrandTotal : parseFloat(parsedData.printedGrandTotal);

    return {
      supplierName: parsedData.supplierName ? String(parsedData.supplierName).trim() : 'Pharma Distributor',
      invoiceNo: parsedData.invoiceNo ? String(parsedData.invoiceNo).trim() : `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: parseExpiryDate(parsedData.invoiceDate) || parsedData.invoiceDate || new Date().toISOString().split('T')[0],
      printedSubtotal: !isNaN(pSub) ? pSub : null,
      printedRoundOff: !isNaN(pRound) ? pRound : null,
      printedGrandTotal: !isNaN(pGrand) ? pGrand : null,
      items,
    };
  } catch (error) {
    console.error('[Gemini OCR Error] Failed to extract invoice with Gemini:', error.message);
    throw error;
  }
};

/**
 * Parses invoice image buffer(s) using Gemini with auto-retry on suspicious incompleteness.
 * @param {Buffer|Array<Object>} inputData - Image buffer or array of { buffer, mimeType }
 * @param {string} mimeType - Image mime type
 * @returns {Promise<Object>} Extracted invoice header & line items
 */
const parseInvoiceImageWithGemini = async (inputData, mimeType = 'image/jpeg') => {
  const firstAttempt = await attemptExtraction(inputData, mimeType);

  const referenceTotal = firstAttempt.printedGrandTotal || firstAttempt.printedSubtotal;
  const extractedSum = (firstAttempt.items || []).reduce((sum, it) => {
    const lineVal = it.printedLineTotal || (it.qty * it.purchaseRate) || 0;
    return sum + lineVal;
  }, 0);

  const looksIncomplete = referenceTotal && referenceTotal > 0 &&
    extractedSum < referenceTotal * 0.6; // extracted items cover less than 60% of the invoice's own printed total

  if (!looksIncomplete) {
    return { ...firstAttempt, ocrRetried: false, possibleMissingItems: false };
  }

  console.warn('[OCR Completeness Check] First attempt looks incomplete, retrying once...');
  try {
    const secondAttempt = await attemptExtraction(inputData, mimeType);
    const secondSum = (secondAttempt.items || []).reduce((sum, it) => {
      const lineVal = it.printedLineTotal || (it.qty * it.purchaseRate) || 0;
      return sum + lineVal;
    }, 0);

    // Use whichever attempt captured more of the invoice's value
    if (secondSum > extractedSum) {
      return { ...secondAttempt, ocrRetried: true, possibleMissingItems: secondSum < referenceTotal * 0.9 };
    }
    return { ...firstAttempt, ocrRetried: true, possibleMissingItems: true };
  } catch (retryErr) {
    console.warn('[OCR Completeness Check] Retry failed, returning first attempt:', retryErr.message);
    return { ...firstAttempt, ocrRetried: true, possibleMissingItems: true };
  }
};

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

/**
 * Preprocesses invoice image using sharp before Gemini OCR extraction.
 * Corrects EXIF orientation, resizes to max 2000x2000, and normalizes to high quality JPEG.
 * Skips PDFs and gracefully falls back to original buffer if sharp fails or is missing.
 */
async function preprocessInvoiceImage(buffer, mimeType) {
  if (!buffer || mimeType === 'application/pdf') {
    return { buffer, mimeType };
  }

  if (!sharp) {
    console.warn('[Invoice Preprocess] sharp module not available, using raw buffer');
    return { buffer, mimeType };
  }

  try {
    const processedBuffer = await sharp(buffer)
      .rotate() // auto-orient using EXIF, then strip EXIF orientation tag
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    return { buffer: processedBuffer, mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[Invoice Preprocess] Failed to preprocess image, falling back to original buffer:', err.message);
    return { buffer, mimeType }; // graceful fallback — never block scan feature
  }
}

module.exports = {
  parseInvoiceImageWithGemini,
  parseExpiryDate,
  preprocessInvoiceImage,
};
