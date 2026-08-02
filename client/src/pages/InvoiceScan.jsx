import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Building2,
  Calendar,
  Receipt,
  Sparkles,
  ShieldAlert,
  Search
} from 'lucide-react';
import { scanInvoice, confirmInvoice, searchInvoiceByNumber } from '@/services/invoiceService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { SupplierAutocomplete } from '@/components/SupplierAutocomplete';
import { Badge } from '@/components/ui/Badge';
import { roundMoney } from '@/utils/money';

export function InvoiceScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Workflow states: 'upload' | 'scanning' | 'review' | 'success'
  const [step, setStep] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Previous Invoice State
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [searchInvoiceResults, setSearchInvoiceResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const handleSearchInvoice = async (e) => {
    if (e) e.preventDefault();
    if (!searchInvoiceNo.trim()) return;

    setIsSearchingInvoice(true);
    setSearchError(null);
    setSearchInvoiceResults(null);

    try {
      const res = await searchInvoiceByNumber(searchInvoiceNo.trim());
      setSearchInvoiceResults(res.data || []);
    } catch (err) {
      console.error('Invoice Search Error:', err);
      setSearchError(err.response?.data?.error?.message || 'No invoice found with this number.');
    } finally {
      setIsSearchingInvoice(false);
    }
  };

  // Extracted / Editable Data
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [printedSubtotal, setPrintedSubtotal] = useState(null);
  const [printedRoundOff, setPrintedRoundOff] = useState(null);
  const [printedGrandTotal, setPrintedGrandTotal] = useState(null);
  const [storeType, setStoreType] = useState('medical');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [rawOcrText, setRawOcrText] = useState('');
  const [possibleMissingItems, setPossibleMissingItems] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    setSelectedFile(file);
    setErrorMsg('');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    runOcrScan(file);
  };

  // OCR Scan Action
  const runOcrScan = async (file) => {
    setStep('scanning');
    setErrorMsg('');

    try {
      const result = await scanInvoice(file);
      setSupplierName(result.supplierName || 'Distributor Agency');
      setInvoiceNo(result.invoiceNo || `INV-${Date.now().toString().slice(-5)}`);
      setInvoiceDate(result.invoiceDate || new Date().toISOString().split('T')[0]);
      setPrintedSubtotal(result.printedSubtotal ?? null);
      setPrintedRoundOff(result.printedRoundOff ?? null);
      setPrintedGrandTotal(result.printedGrandTotal ?? null);
      setRawOcrText(result.rawText || '');
      setPossibleMissingItems(Boolean(result.possibleMissingItems));

      const parsedItems = (result.items || []).map((item) => {
        const pTotal = typeof item.printedLineTotal === 'number' && !isNaN(item.printedLineTotal) && item.printedLineTotal > 0
          ? item.printedLineTotal
          : null;

        return {
          ...item,
          printedLineTotal: pTotal,
          purchaseRate: Number(item.purchaseRate) || 0,
          discPercent: Number(item.discPercent) || 0,
          isManuallyEdited: false,
        };
      });

      if (parsedItems.length === 0) {
        // Fallback row if no items parsed
        setItems([
          {
            name: '',
            composition: '',
            batchNo: '',
            expiryDate: '',
            qty: 10,
            purchaseRate: 0,
            mrp: 0,
            gstPercent: 12,
            confidence: 'low',
          },
        ]);
      } else {
        setItems(parsedItems);
      }
      setStep('review');
    } catch (err) {
      console.error('[OCR Scan Error]', err);
      setErrorMsg(
        err.response?.data?.error?.message ||
        'Could not parse invoice clearly. You can still enter items manually below.'
      );
      // Fallback to manual entry step with 1 empty row
      setSupplierName('Distributor Agency');
      setInvoiceNo(`INV-${Date.now().toString().slice(-5)}`);
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setItems([
        {
          name: '',
          composition: '',
          batchNo: '',
          expiryDate: '',
          qty: 10,
          purchaseRate: 0,
          mrp: 0,
          gstPercent: 12,
          confidence: 'low',
        },
      ]);
      setStep('review');
    }
  };

  // Row Manipulation
  const handleItemChange = (index, field, value) => {
    const cleanValue = typeof value === 'string' && value.length > 1 && /^0\d/.test(value)
      ? value.replace(/^0+/, '')
      : value;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: cleanValue,
        isManuallyEdited: true, // Mark row as manually edited by user
      };
      return updated;
    });
  };

  const addBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        composition: '',
        hsnCode: '',
        location: '',
        batchNo: '',
        expiryDate: '',
        qty: 10,
        freeQty: 0,
        purchaseRate: 0,
        mrp: 0,
        gstPercent: 0,
        confidence: 'high',
        isManuallyEdited: true,
      },
    ]);
  };

  const removeRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submission Handler
  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item before confirming.');
      return;
    }

    // Validate rows
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || !item.name.trim()) {
        alert(`Row #${i + 1}: Item name is required.`);
        return;
      }
      if (!item.batchNo || !item.batchNo.trim()) {
        alert(`Row #${i + 1}: Batch number is required for "${item.name}".`);
        return;
      }
      if (storeType === 'medical' && !item.expiryDate) {
        alert(`Row #${i + 1}: Expiry date is required for Medical Store item "${item.name}".`);
        return;
      }
    }

    // Ensure purchaseRate reflects post-discount effective rate before submitting to backend
    const itemsPayload = items.map((item) => {
      const isEdited = Boolean(item.isManuallyEdited);
      const pTotal = typeof item.printedLineTotal === 'number' && !isNaN(item.printedLineTotal) && item.printedLineTotal > 0
        ? item.printedLineTotal
        : null;

      let finalRate = Number(item.purchaseRate) || 0;
      if (!isEdited && pTotal !== null && Number(item.qty) > 0) {
        const gstPercent = Number(item.gstPercent) || 0;
        const lineBase = pTotal / (1 + gstPercent / 100);
        finalRate = roundMoney(lineBase / Number(item.qty));
      } else if (!isEdited && pTotal === null) {
        const discPercent = Number(item.discPercent) || 0;
        finalRate = roundMoney(finalRate * (1 - discPercent / 100));
      }

      return {
        ...item,
        purchaseRate: finalRate,
      };
    });

    setIsSubmitting(true);
    try {
      const res = await confirmInvoice({
        supplierName,
        invoiceNo,
        invoiceDate,
        printedSubtotal,
        printedRoundOff,
        printedGrandTotal,
        storeType,
        paymentStatus,
        items: itemsPayload,
      });

      setSuccessData(res.data);
      setStep('success');
    } catch (err) {
      console.error('[Confirm Invoice Error]', err);
      alert(err.response?.data?.error?.message || 'Failed to save confirmed invoice to stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals (trusting printedLineTotal per row when available and unedited)
  const calculatedRowTotals = items.map((item) => {
    const isEdited = Boolean(item.isManuallyEdited);
    const pTotal = typeof item.printedLineTotal === 'number' && !isNaN(item.printedLineTotal) && item.printedLineTotal > 0
      ? item.printedLineTotal
      : null;

    const qty = Number(item.qty) || 0;
    const rate = Number(item.purchaseRate) || 0;
    const discPercent = Number(item.discPercent) || 0;
    const gstPercent = Number(item.gstPercent) || 0;

    if (!isEdited && pTotal !== null) {
      const lineBase = roundMoney(pTotal / (1 + gstPercent / 100));
      const lineGst = roundMoney(pTotal - lineBase);
      return {
        lineBase,
        lineGst,
        lineTotal: pTotal,
      };
    }

    const lineBase = roundMoney(qty * rate * (1 - discPercent / 100));
    const lineGst = roundMoney((lineBase * gstPercent) / 100);
    const lineTotal = roundMoney(lineBase + lineGst);
    return {
      lineBase,
      lineGst,
      lineTotal,
    };
  });

  const baseCalculatedAmount = roundMoney(
    calculatedRowTotals.reduce((sum, row) => sum + row.lineBase, 0)
  );

  const totalGstAmount = roundMoney(
    calculatedRowTotals.reduce((sum, row) => sum + row.lineGst, 0)
  );

  const totalCgstAmount = roundMoney(totalGstAmount / 2);
  const totalSgstAmount = roundMoney(totalGstAmount - totalCgstAmount);
  const totalCalculatedAmount = roundMoney(
    calculatedRowTotals.reduce((sum, row) => sum + row.lineTotal, 0)
  );
  const mismatchAmount =
    printedGrandTotal !== null ? roundMoney(totalCalculatedAmount - printedGrandTotal) : 0;
  const hasSignificantMismatch = Math.abs(mismatchAmount) > 1;

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row justify-between gap-4 ${step === 'upload' ? 'items-center text-center sm:text-left' : 'sm:items-center'}`}>
          <div className={step === 'upload' ? 'text-center w-full' : ''}>
            <h1 className={`text-2xl font-heading font-bold text-primary flex items-center gap-2 ${step === 'upload' ? 'justify-center' : ''}`}>
              <ScanLine className="w-6 h-6 text-secondary" />
              <span>Smart Invoice Scanner (OCR)</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Upload purchase invoices to automatically extract items, batches, rates, and quantities using Google Vision OCR.
            </p>
          </div>

          {step === 'review' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep('upload');
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="gap-2 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload Different Invoice</span>
            </Button>
          )}
        </div>

        {/* FEATURE 1: SEARCH PREVIOUS INVOICE CARD */}
        <Card className="p-5 bg-white/90 shadow-sm border border-secondary/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-heading font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-secondary" />
                <span>Search Previous Scanned Invoice</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Type an invoice number to view its full saved details, line items, batches, and shelf locations.
              </p>
            </div>

            <form onSubmit={handleSearchInvoice} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Enter Invoice Number..."
                value={searchInvoiceNo}
                onChange={(e) => setSearchInvoiceNo(e.target.value)}
                className="h-9 text-xs bg-white w-full sm:w-64 font-mono"
              />
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSearchingInvoice || !searchInvoiceNo.trim()}
                className="h-9 px-4 text-xs font-semibold gap-1.5 shrink-0"
              >
                {isSearchingInvoice ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </Button>
            </form>
          </div>

          {/* Search Error / 404 Message */}
          {searchError && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span>{searchError}</span>
              <button
                type="button"
                onClick={() => setSearchError(null)}
                className="text-amber-600 hover:text-amber-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search Results Display */}
          {searchInvoiceResults && searchInvoiceResults.length > 0 && (
            <div className="mt-5 space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary font-mono">
                  Found {searchInvoiceResults.length} Matched Invoice{searchInvoiceResults.length > 1 ? 's' : ''}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInvoiceResults(null);
                    setSearchInvoiceNo('');
                  }}
                  className="h-7 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear Results
                </Button>
              </div>

              {searchInvoiceResults.map((inv) => (
                <div key={inv._id} className="p-4 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                  {/* Header Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pb-3 border-b border-teal-200/60">
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-muted">Invoice No</span>
                      <span className="font-bold font-mono text-primary text-sm">{inv.invoiceNo}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-muted">Supplier</span>
                      <span className="font-semibold text-gray-900">{inv.supplierName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-muted">Invoice Date</span>
                      <span className="font-mono text-gray-800">
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-muted">Printed Total</span>
                      <span className="font-bold font-mono text-teal-800">
                        ₹{(inv.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-white/80 border-b border-teal-200 text-gray-700 font-mono uppercase text-[10px]">
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">Composition</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Batch No</th>
                          <th className="py-2 px-3">Expiry</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-2 text-right">P.Rate (₹)</th>
                          <th className="py-2 px-2 text-right">MRP (₹)</th>
                          <th className="py-2 px-2 text-center">GST %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-100/60 bg-white/60">
                        {(inv.items || []).map((itemEntry, iIdx) => {
                          const ext = itemEntry.extractedData || {};
                          const batch = itemEntry.batch || {};
                          const liveItem = batch.itemId || {};

                          const name = liveItem.name || ext.name || 'N/A';
                          const comp = liveItem.composition || ext.composition || '';
                          const loc = liveItem.location || ext.location || '';
                          const batchNo = batch.batchNo || ext.batchNo || 'N/A';
                          const expiry = batch.expiryDate || ext.expiryDate;
                          const qty = batch.initialQty !== undefined ? batch.initialQty : ext.qty;
                          const freeQty = batch.freeQty !== undefined ? batch.freeQty : (ext.freeQty || 0);
                          const pRate = batch.purchaseRate !== undefined ? batch.purchaseRate : ext.purchaseRate;
                          const mrp = batch.mrp !== undefined ? batch.mrp : ext.mrp;
                          const gst = batch.gstPercent !== undefined ? batch.gstPercent : ext.gstPercent;

                          return (
                            <tr key={iIdx} className="hover:bg-teal-100/40">
                              <td className="py-2 px-3 font-semibold text-primary">{name}</td>
                              <td className="py-2 px-3 text-muted text-[11px]">{comp || '-'}</td>
                              <td className="py-2 px-3 font-medium text-teal-800">
                                {loc ? (
                                  <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 font-mono text-[10px]">
                                    📍 {loc}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-mono text-[10px]">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-gray-800">{batchNo}</td>
                              <td className="py-2 px-3 font-mono text-gray-700 text-[11px]">
                                {expiry ? new Date(expiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-primary">
                                <span>{qty}</span>
                                {freeQty > 0 && <span className="text-teal-700 text-[10px] font-semibold block">(+{freeQty} Free)</span>}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">₹{Number(pRate || 0).toFixed(2)}</td>
                              <td className="py-2 px-2 text-right font-mono">₹{Number(mrp || 0).toFixed(2)}</td>
                              <td className="py-2 px-2 text-center font-mono">{gst}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* STEP 1: UPLOAD ZONE */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto py-8">
            <Card
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 md:p-14 text-center border-2 border-dashed cursor-pointer transition-all duration-200 bg-white/90 ${isDragging
                ? 'border-secondary bg-secondary/10 shadow-lg scale-[1.01]'
                : 'border-secondary/40 hover:border-secondary hover:bg-teal-50/30 shadow-card'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-4 border border-secondary/20">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-heading font-bold text-primary">
                Drag and drop your invoice image here
              </h3>
              <p className="text-xs text-muted mt-1">
                Supports JPG, PNG, WEBP, or PDF invoice scans up to 10MB
              </p>

              <div className="mt-6">
                <Button variant="default" size="md" className="gap-2 px-6 shadow-md font-semibold pointer-events-none">
                  <FileText className="w-4 h-4 text-accent" />
                  <span>Select Image / PDF File</span>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 2: SCANNING ANIMATION */}
        {step === 'scanning' && (
          <Card className="p-12 max-w-xl mx-auto text-center flex flex-col items-center justify-center gap-4 bg-white/90">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-secondary/30 border-t-secondary animate-spin" />
              <ScanLine className="w-8 h-8 text-primary animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-heading font-bold text-primary">
                Scanning Invoice with Vision OCR...
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Extracting medicine names, compositions, batch numbers, rates, and expiry dates from {selectedFile?.name || 'file'}.
              </p>
            </div>
          </Card>
        )}

        {/* STEP 3: REVIEW & EDIT TABLE */}
        {step === 'review' && (
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
            {possibleMissingItems && (
              <div className="text-xs font-semibold text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-2 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">⚠ Possible Missing Line Items Detected</p>
                  <p className="mt-0.5 text-[11px] text-red-700">
                    The scanner detected that extracted line items cover much less than the invoice's own printed total (even after a retry). Please manually count the rows on the physical invoice against the table below before confirming, and use "+ Add Line Item" for anything missing.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{errorMsg}</p>
                  <p className="mt-0.5 text-[11px]">
                    You can review, edit, or manually add missing line items before clicking Confirm.
                  </p>
                </div>
              </div>
            )}

            {/* Invoice Header Details Card */}
            <Card className="p-5 border-l-4 border-l-primary bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-secondary" />
                <span>Invoice Header Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="supplierName">Supplier / Distributor Name</Label>
                  <SupplierAutocomplete
                    id="supplierName"
                    value={supplierName}
                    onChange={(val) => setSupplierName(val)}
                    placeholder="e.g. Apex Pharma Agency"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceNo">Invoice Number</Label>
                  <Input
                    id="invoiceNo"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-091"
                    className="mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="storeType">Destination Store</Label>
                  <Select
                    id="storeType"
                    value={storeType}
                    onChange={(e) => setStoreType(e.target.value)}
                    className="mt-1 font-semibold text-primary"
                  >
                    <option value="medical">Medical Store (Pharmacy)</option>
                    <option value="provision">Provision Store</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    id="paymentStatus"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className={`mt-1 font-semibold ${paymentStatus === 'paid' ? 'text-teal-800 bg-teal-50 border-teal-300' : 'text-amber-800 bg-amber-50 border-amber-300'}`}
                  >
                    <option value="pending">Pending (Unpaid)</option>
                    <option value="paid">Paid (Fully Settled)</option>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Line Items Table Card */}
            <Card className="p-5 bg-white/90">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-heading font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    <span>Extracted Line Items ({items.length})</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Review and adjust OCR fields. Rows flagged with <span className="text-amber-700 font-semibold">Low Confidence</span> require verification.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBlankRow}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-secondary" />
                  <span>Add Line Item</span>
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[1450px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-2 text-center w-10">Scan</th>
                      <th className="py-2.5 px-3 min-w-[260px] w-72">Item Name *</th>
                      {storeType === 'medical' && <th className="py-2.5 px-3 min-w-[220px] w-64">Composition</th>}
                      <th className="py-2.5 px-2 min-w-[110px] w-28">HSN Code</th>
                      <th className="py-2.5 px-3 min-w-[150px] w-40">Shelf / Counter</th>
                      <th className="py-2.5 px-3 min-w-[130px] w-36">Batch No *</th>
                      <th className="py-2.5 px-3 min-w-[140px] w-36">Expiry Date {storeType === 'medical' ? '*' : ''}</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px] w-20">Qty *</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px] w-20">Free Qty</th>
                      <th className="py-2.5 px-2 text-right min-w-[100px] w-28">P.Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right min-w-[100px] w-28">MRP (₹)</th>
                      <th className="py-2.5 px-2 text-center min-w-[110px] w-28">GST %</th>
                      <th className="py-2.5 px-3 text-right min-w-[120px] w-32">Total (₹)</th>
                      <th className="py-2.5 px-2 text-center w-10">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => {
                      const rowCalc = calculatedRowTotals[idx] || { lineTotal: 0 };
                      const lineTotal = rowCalc.lineTotal;
                      const lineGstPercent = Number(item.gstPercent) || 0;
                      const halfGst = (lineGstPercent / 2).toFixed(1);

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-gray-50/80 ${item.confidence === 'low' ? 'bg-amber-50/40 border-l-4 border-l-amber-400' : ''
                            }`}
                        >
                          {/* Status/Confidence */}
                          <td className="py-2 px-2 text-center">
                            {item.confidence === 'high' ? (
                              <span title="High Confidence Extraction">
                                <CheckCircle2 className="w-4 h-4 text-teal-600 inline" />
                              </span>
                            ) : (
                              <span title="Low Confidence - Please verify">
                                <AlertTriangle className="w-4 h-4 text-amber-500 inline animate-pulse" />
                              </span>
                            )}
                          </td>

                          {/* Item Name */}
                          <td className="py-2 px-2 min-w-[260px]">
                            <Input
                              value={item.name || ''}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              placeholder="Medicine Name"
                              className="h-8 text-xs font-semibold text-primary w-full min-w-[250px]"
                            />
                          </td>

                          {/* Composition */}
                          {storeType === 'medical' && (
                            <td className="py-2 px-2 min-w-[220px]">
                              <div className="relative">
                                <Input
                                  value={item.composition || ''}
                                  onChange={(e) => handleItemChange(idx, 'composition', e.target.value)}
                                  placeholder="Salt / Composition"
                                  className={`h-8 text-xs w-full min-w-[210px] ${item.compositionSource === 'auto-filled' ? 'pr-14 bg-teal-50/40' : ''}`}
                                />
                                {item.compositionSource === 'auto-filled' && (
                                  <span
                                    title="Auto-filled from existing medicine history"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-mono text-teal-700 bg-teal-100/90 px-1 py-0.5 rounded border border-teal-300 pointer-events-none"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                                    <span>Auto</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* HSN Code */}
                          <td className="py-2 px-2 min-w-[110px]">
                            <Input
                              value={item.hsnCode || ''}
                              onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                              placeholder="HSN Code"
                              className="h-8 text-xs font-mono w-full min-w-[100px]"
                            />
                          </td>

                          {/* Shelf / Counter Location */}
                          <td className="py-2 px-2 min-w-[150px]">
                            <Input
                              value={item.location || ''}
                              onChange={(e) => handleItemChange(idx, 'location', e.target.value)}
                              placeholder="e.g. Counter 2, Rack A"
                              className="h-8 text-xs w-full min-w-[140px]"
                            />
                          </td>

                          {/* Batch No */}
                          <td className="py-2 px-2 min-w-[130px]">
                            <Input
                              value={item.batchNo || ''}
                              onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                              placeholder="Batch No"
                              className="h-8 text-xs font-mono font-semibold w-full min-w-[120px]"
                            />
                          </td>

                          {/* Expiry Date */}
                          <td className="py-2 px-2 min-w-[140px]">
                            <Input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                              placeholder={storeType === 'provision' ? 'Optional' : ''}
                              className="h-8 text-xs font-mono w-full min-w-[130px]"
                            />
                          </td>

                          {/* Qty */}
                          <td className="py-2 px-2 min-w-[80px]">
                            <Input
                              type="number"
                              min="0"
                              value={item.qty !== undefined && item.qty !== null ? item.qty : ''}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              className="h-8 text-xs font-mono text-center font-bold w-full min-w-[65px]"
                            />
                          </td>

                          {/* Free Qty */}
                          <td className="py-2 px-2 min-w-[80px]">
                            <Input
                              type="number"
                              min="0"
                              value={item.freeQty !== undefined && item.freeQty !== null ? item.freeQty : 0}
                              onChange={(e) => handleItemChange(idx, 'freeQty', e.target.value)}
                              placeholder="0"
                              className="h-8 text-xs font-mono text-center font-semibold text-teal-800 bg-teal-50/50 border-teal-200 w-full min-w-[65px]"
                            />
                          </td>

                          {/* Purchase Rate */}
                          <td className="py-2 px-2 min-w-[100px]">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.purchaseRate !== undefined && item.purchaseRate !== null ? item.purchaseRate : ''}
                              onChange={(e) => handleItemChange(idx, 'purchaseRate', e.target.value)}
                              className="h-8 text-xs font-mono text-right w-full min-w-[85px]"
                            />
                          </td>

                          {/* MRP */}
                          <td className="py-2 px-2 min-w-[100px]">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.mrp !== undefined && item.mrp !== null ? item.mrp : ''}
                              onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                              className="h-8 text-xs font-mono text-right font-medium w-full min-w-[85px]"
                            />
                          </td>

                          {/* GST % with CGST / SGST sub-text */}
                          <td className="py-2 px-2 min-w-[110px] text-center">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.gstPercent !== undefined && item.gstPercent !== null ? item.gstPercent : ''}
                              onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
                              className="h-8 text-xs font-mono text-center w-full min-w-[85px] mx-auto"
                            />
                            <span className="block text-[9px] font-mono text-muted mt-0.5 whitespace-nowrap">
                              {halfGst}%C + {halfGst}%S
                            </span>
                          </td>

                          {/* Per-row Total */}
                          <td className="py-2 px-3 min-w-[120px] text-right font-mono font-bold text-gray-900 text-xs">
                            ₹{lineTotal.toFixed(2)}
                          </td>

                          {/* Delete Row */}
                          <td className="py-2 px-2 text-center w-10">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-1 rounded text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                              title="Remove Line Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl">
                <div className="flex flex-col gap-1.5 text-xs font-mono">
                  <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Items: <strong className="text-primary font-bold">{items.length}</strong></span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span>Base: <strong className="text-gray-700">₹{baseCalculatedAmount.toFixed(2)}</strong></span>
                    <span>+ CGST: <strong className="text-gray-700">₹{totalCgstAmount.toFixed(2)}</strong></span>
                    <span>+ SGST: <strong className="text-gray-700">₹{totalSgstAmount.toFixed(2)}</strong></span>
                    <span>= GST: <strong className="text-gray-900 font-bold">₹{totalGstAmount.toFixed(2)}</strong></span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span>Calculated Total: <strong className="text-primary font-bold text-sm">₹{totalCalculatedAmount.toFixed(2)}</strong></span>
                  </div>

                  {(printedRoundOff !== null || printedGrandTotal !== null) && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      <span className="font-semibold uppercase tracking-wider">Printed Invoice Header:</span>
                      {printedSubtotal !== null && <span>Subtotal: ₹{printedSubtotal.toFixed(2)}</span>}
                      {printedRoundOff !== null && <span>• Round Off: <strong className="font-bold">{printedRoundOff >= 0 ? `+₹${printedRoundOff.toFixed(2)}` : `-₹${Math.abs(printedRoundOff).toFixed(2)}`}</strong></span>}
                      {printedGrandTotal !== null && <span>• Printed Net Total: <strong className="font-bold text-teal-900">₹{printedGrandTotal.toFixed(2)}</strong></span>}
                    </div>
                  )}

                  {hasSignificantMismatch && (
                    <div className="flex items-center gap-2 text-[11px] text-red-800 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                      <span className="font-semibold uppercase tracking-wider">⚠ Mismatch:</span>
                      <span>
                        Calculated total differs from printed invoice total by{' '}
                        <strong className="font-bold">₹{Math.abs(mismatchAmount).toFixed(2)}</strong>.
                        Please recheck quantities, rates, or GST% before confirming.
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative inline-flex overflow-hidden rounded-xl p-[1.5px] focus:outline-none focus:ring-2 focus:ring-secondary shrink-0 group transition-transform active:scale-95 disabled:opacity-50"
                >
                  <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#0B4C52_0%,#17878E_33%,#5CA627_66%,#0B4C52_100%)]" />
                  <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white gap-2 backdrop-blur-3xl shadow-lg">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>{isSubmitting ? 'Saving to Stock...' : 'Confirm & Save to Stock'}</span>
                  </span>
                </button>
              </div>
            </Card>
          </form>
        )}

        {/* STEP 4: SUCCESS SUMMARY */}
        {step === 'success' && successData && (
          <Card className="p-10 max-w-xl mx-auto text-center flex flex-col items-center justify-center gap-4 bg-white/95 border-l-4 border-l-accent shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 text-secondary flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-secondary" />
            </div>

            <div>
              <h2 className="text-xl font-heading font-bold text-primary">
                Invoice Saved to Inventory!
              </h2>
              <p className="text-xs text-muted mt-1">
                Successfully processed invoice <strong>{invoiceNo}</strong> from {supplierName}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full my-2 p-4 rounded-xl bg-gray-50 font-mono text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-muted text-[10px] uppercase">Items Created/Updated</p>
                <p className="text-xl font-bold text-primary mt-1">{successData.createdItemsCount}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-muted text-[10px] uppercase">New Batches Added</p>
                <p className="text-xl font-bold text-secondary-dark mt-1">{successData.createdBatchesCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setSuccessData(null);
                }}
              >
                Scan Another Invoice
              </Button>

              <Button
                variant="default"
                onClick={() => navigate(storeType === 'medical' ? '/stock' : '/provision')}
                className="gap-2"
              >
                <span>View in {storeType === 'medical' ? 'Medical Stock' : 'Provision Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default InvoiceScan;
