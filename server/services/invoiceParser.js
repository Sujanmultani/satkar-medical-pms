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
     - purchaseRate: Net effective purchase rate per unit POST-DISCOUNT (number).
     - mrp: Maximum Retail Price per pack (number).
     - gstPercent: Read the EXACT GST/tax percentage printed for THIS SPECIFIC line item (number).
     - printedLineTotal: Printed final line item amount figure if printed on this line (number or null).
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
      "purchaseRate": 0.0,
      "mrp": 0.0,
      "gstPercent": null,
      "printedLineTotal": null,
      "confidence": "high"
    }
  ]
}
`;

/**
 * Parses an invoice image buffer using Gemini via Vertex AI.
 * @param {Buffer} fileBuffer - Image buffer
 * @param {string} mimeType - Image mime type (e.g., image/jpeg, image/png)
 * @returns {Promise<Object>} Extracted invoice header & line items
 */
const parseInvoiceImageWithGemini = async (fileBuffer, mimeType = 'image/jpeg') => {
  try {
    const generativeModel = getGenerativeModel();

    const imagePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType,
      },
    };

    const textPart = {
      text: EXTRACTION_PROMPT,
    };

    const response = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [imagePart, textPart] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
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
      const parsedRate = typeof item.purchaseRate === 'number' && !isNaN(item.purchaseRate) ? item.purchaseRate : parseFloat(item.purchaseRate);
      const parsedMrp = typeof item.mrp === 'number' && !isNaN(item.mrp) ? item.mrp : parseFloat(item.mrp);
      const parsedGst = typeof item.gstPercent === 'number' && !isNaN(item.gstPercent) ? item.gstPercent : parseFloat(item.gstPercent);
      const parsedPrintedTotal = typeof item.printedLineTotal === 'number' && !isNaN(item.printedLineTotal) ? item.printedLineTotal : parseFloat(item.printedLineTotal);
      const hasValidGst = !isNaN(parsedGst) && parsedGst >= 0;

      let cat = item.category ? String(item.category).trim() : '';
      if (!validCategories.includes(cat)) {
        cat = 'Tablet';
      }

      let u = item.unit ? String(item.unit).trim() : '';
      if (!validUnits.includes(u)) {
        u = 'strip';
      }

      return {
        name: item.name ? String(item.name).trim() : 'Unknown Product',
        composition: item.composition ? String(item.composition).trim() : '',
        category: cat,
        unit: u,
        hsnCode: item.hsnCode ? String(item.hsnCode).trim() : '',
        batchNo: item.batchNo ? String(item.batchNo).trim() : `B-${Date.now().toString().slice(-4)}`,
        expiryDate: item.expiryDate ? parseExpiryDate(item.expiryDate) || item.expiryDate : null,
        qty: !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1,
        purchaseRate: !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : 0,
        mrp: !isNaN(parsedMrp) && parsedMrp >= 0 ? parsedMrp : 0,
        gstPercent: hasValidGst ? parsedGst : null,
        printedLineTotal: !isNaN(parsedPrintedTotal) && parsedPrintedTotal > 0 ? parsedPrintedTotal : null,
        confidence: (!hasValidGst || item.confidence === 'low') ? 'low' : 'high',
      };
    });

    // Server-side De-duplication Safety Net:
    // Merge items sharing identical batchNo AND purchaseRate
    const items = [];
    const seenMap = new Map();

    for (const item of rawItems) {
      const normalizedBatch = item.batchNo.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${normalizedBatch}_${item.purchaseRate.toFixed(2)}`;

      if (normalizedBatch && seenMap.has(dedupKey)) {
        const existingIdx = seenMap.get(dedupKey);
        const existing = items[existingIdx];

        // Merge: keep longer/more complete product name
        if (item.name.length > existing.name.length) {
          existing.name = item.name;
        }
        // Keep non-empty composition / hsnCode if available
        if (!existing.composition && item.composition) {
          existing.composition = item.composition;
        }
        if (!existing.hsnCode && item.hsnCode) {
          existing.hsnCode = item.hsnCode;
        }
        // Retain max qty & mrp
        existing.qty = Math.max(existing.qty, item.qty);
        existing.mrp = Math.max(existing.mrp, item.mrp);
        // Assign low confidence so human admin double-checks during confirmation
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

module.exports = {
  parseInvoiceImageWithGemini,
  parseExpiryDate,
};
