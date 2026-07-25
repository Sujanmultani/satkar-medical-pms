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
   - supplierName: Name of the distributor/seller (e.g., "CAMBAY PHARMA AGENCIES", "ASHA MEDICAL AGENCY"). Do NOT extract the buyer name (e.g., "SATKAR MEDICAL" / "M/S: SATKAR MEDICAL").
   - invoiceNo: Invoice/bill reference number (e.g., "INV-1092", "24-25/9981").
   - invoiceDate: Invoice date formatted as YYYY-MM-DD.

2. LINE ITEMS (Medicines & Products Purchased):
   - Extract only genuine product purchase lines.
   - EXCLUDE: Distributor address/phone/license boilerplate, disclaimers ("Subject to Jurisdiction", "FSSAI", "DL No", "SUNDAY CLOSED"), buyer address, table header rows ("EX.D/BATCH.NO", "HSN", "DESCRIPTION", "QTY", "MRP", "RATE"), tax/GST summary rows ("GST Base", "CGST", "SGST", "Total Amount"), and amount-in-words lines.
   - For each real product line, extract:
     - name: Medicine/product brand name (e.g., "IMOXCL CLAV 500 TAB", "ZEDEX COUGH SYP").
     - composition: Set to null (unless salt name is explicitly printed in parentheses on the line).
     - hsnCode: HSN/SAC code if printed (numeric or alphanumeric, e.g. "30049099", "1512", or null).
     - batchNo: Batch alphanumeric code (e.g., "BRND01", "D1362107", "CA1S15", "1TX2501").
     - expiryDate: Expiry date as YYYY-MM-DD (convert bare MM/YY or MM/YYYY to last day of month, e.g. "06/27" -> "2027-06-30").
     - qty: Number of packs/units purchased (integer, default 1).
     - purchaseRate: Purchase rate per pack (number).
     - mrp: Maximum Retail Price per pack (number).
     - gstPercent: GST percentage (number, e.g. 5, 12, 18, 6.9, 13.54).
     - confidence: "high" if name, batchNo, expiryDate, and rate/mrp are clearly legible; otherwise "low".

3. STRICT DUPLICATE PREVENTION & MERGING RULES:
   - Each physical purchase line item on the invoice must appear EXACTLY ONCE in the JSON output array.
   - If an item's description or brand name appears split across adjacent text fragments (e.g., "APIDRA CARTRIDGE" and "APIDRA" with identical batch number and rate/MRP), treat them as THE SAME SINGLE ITEM, NOT TWO SEPARATE ITEMS.
   - If two candidate lines share the SAME batch number AND the SAME purchase rate/MRP, merge them into a single line item with the most complete product name, and set confidence to "low".

OUTPUT JSON FORMAT (Strict JSON):
{
  "supplierName": "String",
  "invoiceNo": "String",
  "invoiceDate": "YYYY-MM-DD",
  "items": [
    {
      "name": "String",
      "composition": null,
      "hsnCode": "String",
      "batchNo": "String",
      "expiryDate": "YYYY-MM-DD",
      "qty": 1,
      "purchaseRate": 0.0,
      "mrp": 0.0,
      "gstPercent": 12,
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
        mimeType: mimeType || 'image/jpeg',
      },
    };

    const resp = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [imagePart, { text: EXTRACTION_PROMPT }] }],
    });

    const candidate = resp.response?.candidates?.[0];
    const textOutput = candidate?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error('Gemini API returned an empty response.');
    }

    const parsedData = JSON.parse(textOutput);

    // Post-process and normalize fields
    const rawItems = (parsedData.items || []).map((item) => ({
      name: item.name ? String(item.name).trim() : 'Unknown Product',
      composition: item.composition ? String(item.composition).trim() : '',
      hsnCode: item.hsnCode ? String(item.hsnCode).trim() : '',
      batchNo: item.batchNo ? String(item.batchNo).trim() : `B-${Date.now().toString().slice(-4)}`,
      expiryDate: item.expiryDate ? parseExpiryDate(item.expiryDate) || item.expiryDate : null,
      qty: Number(item.qty) || 1,
      purchaseRate: Number(item.purchaseRate) || 0,
      mrp: Number(item.mrp) || 0,
      gstPercent: Number(item.gstPercent) || 12,
      confidence: ['high', 'low'].includes(item.confidence) ? item.confidence : 'low',
    }));

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

    return {
      supplierName: parsedData.supplierName ? String(parsedData.supplierName).trim() : 'Pharma Distributor',
      invoiceNo: parsedData.invoiceNo ? String(parsedData.invoiceNo).trim() : `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: parseExpiryDate(parsedData.invoiceDate) || parsedData.invoiceDate || new Date().toISOString().split('T')[0],
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
