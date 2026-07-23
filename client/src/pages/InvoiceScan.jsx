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
  ShieldAlert
} from 'lucide-react';
import { scanInvoice, confirmInvoice } from '@/services/invoiceService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

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

  // Extracted / Editable Data
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [storeType, setStoreType] = useState('medical');
  const [items, setItems] = useState([]);
  const [rawOcrText, setRawOcrText] = useState('');
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
      setRawOcrText(result.rawText || '');

      const parsedItems = result.items || [];
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
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        composition: '',
        batchNo: '',
        expiryDate: '',
        qty: 10,
        purchaseRate: 0,
        mrp: 0,
        gstPercent: 12,
        confidence: 'high',
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
      if (!item.expiryDate) {
        alert(`Row #${i + 1}: Expiry date is required for "${item.name}".`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await confirmInvoice({
        supplierName,
        invoiceNo,
        invoiceDate,
        storeType,
        items,
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

  // Calculate totals
  const totalCalculatedAmount = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.purchaseRate) || 0),
    0
  );

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
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

        {/* STEP 1: UPLOAD ZONE */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 text-center border-2 border-dashed cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-secondary bg-secondary/10 shadow-lg scale-[1.01]'
                  : 'border-secondary/40 hover:border-secondary hover:bg-teal-50/30'
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

              <div className="mt-6 inline-flex items-center justify-center">
                <span className="relative inline-flex overflow-hidden rounded-xl p-[1.5px] focus:outline-none focus:ring-2 focus:ring-secondary">
                  <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#0B4C52_0%,#17878E_33%,#5CA627_66%,#0B4C52_100%)]" />
                  <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white gap-2 shadow-md">
                    <FileText className="w-4 h-4 text-accent" />
                    <span>Browse Image File</span>
                  </span>
                </span>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="supplierName">Supplier / Distributor Name</Label>
                  <Input
                    id="supplierName"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
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
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-2 text-center w-12">Scan</th>
                      <th className="py-2.5 px-3">Item Name *</th>
                      {storeType === 'medical' && <th className="py-2.5 px-3">Composition</th>}
                      <th className="py-2.5 px-3 w-32">Batch No *</th>
                      <th className="py-2.5 px-3 w-36">Expiry Date *</th>
                      <th className="py-2.5 px-2 text-center w-20">Qty *</th>
                      <th className="py-2.5 px-2 text-right w-24">P.Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right w-24">MRP (₹)</th>
                      <th className="py-2.5 px-2 text-center w-20">GST %</th>
                      <th className="py-2.5 px-2 text-center w-12">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors hover:bg-gray-50/80 ${
                          item.confidence === 'low' ? 'bg-amber-50/40 border-l-4 border-l-amber-400' : ''
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
                        <td className="py-2 px-2">
                          <Input
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder="Medicine Name"
                            className="h-8 text-xs font-semibold text-primary"
                          />
                        </td>

                        {/* Composition */}
                        {storeType === 'medical' && (
                          <td className="py-2 px-2">
                            <Input
                              value={item.composition || ''}
                              onChange={(e) => handleItemChange(idx, 'composition', e.target.value)}
                              placeholder="Salt / Composition"
                              className="h-8 text-xs"
                            />
                          </td>
                        )}

                        {/* Batch No */}
                        <td className="py-2 px-2">
                          <Input
                            value={item.batchNo || ''}
                            onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                            placeholder="Batch No"
                            className="h-8 text-xs font-mono font-semibold"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="py-2 px-2">
                          <Input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </td>

                        {/* Qty */}
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            className="h-8 text-xs font-mono text-center font-bold"
                          />
                        </td>

                        {/* Purchase Rate */}
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.purchaseRate}
                            onChange={(e) => handleItemChange(idx, 'purchaseRate', e.target.value)}
                            className="h-8 text-xs font-mono text-right"
                          />
                        </td>

                        {/* MRP */}
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.mrp}
                            onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                            className="h-8 text-xs font-mono text-right font-medium"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.gstPercent}
                            onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
                            className="h-8 text-xs font-mono text-center"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl">
                <div className="text-xs text-muted font-mono space-x-4">
                  <span>Total Items: <strong className="text-primary">{items.length}</strong></span>
                  <span>Calculated Invoice Total: <strong className="text-text">₹{totalCalculatedAmount.toFixed(2)}</strong></span>
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
