import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  Trash2, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User, 
  Phone, 
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { getItems } from '@/services/itemService';
import { createBill } from '@/services/billService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { PrintableBill } from '@/components/PrintableBill';

export function Billing() {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Item Search & Picker state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Cart Line Items
  const [lineItems, setLineItems] = useState([]); // [{ item, batch, qty, rate, gst }]

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdBill, setCreatedBill] = useState(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Search Items as user types
  const handleItemSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await getItems({ search: query.trim() });
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Failed to search items:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleItemSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleItemSearch]);

  // Select Item & auto-pick first batch if available
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    const availableBatches = (item.batches || []).filter((b) => b.qty > 0);
    if (availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0]._id);
    } else {
      setSelectedBatchId('');
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Add Item to Bill Line Items
  const handleAddLineItem = () => {
    if (!selectedItem || !selectedBatchId) return;

    const batch = selectedItem.batches.find((b) => b.batchId === selectedBatchId || b._id === selectedBatchId);
    if (!batch) return;

    // Check if item+batch already added
    const existingIndex = lineItems.findIndex((l) => l.batch._id === batch._id);
    if (existingIndex >= 0) {
      const updated = [...lineItems];
      const newQty = updated[existingIndex].qty + 1;
      if (newQty > batch.qty) {
        setErrorMessage(`Cannot add more. Available stock for batch ${batch.batchNo} is ${batch.qty}.`);
        return;
      }
      updated[existingIndex].qty = newQty;
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          item: selectedItem,
          batch,
          qty: 1,
          rate: batch.mrp || 0,
          gst: 0,
        },
      ]);
    }

    setSelectedItem(null);
    setSelectedBatchId('');
    setErrorMessage('');
  };

  // Update specific line item
  const handleUpdateLine = (index, field, value) => {
    const updated = [...lineItems];
    const itemLine = updated[index];

    if (field === 'qty') {
      const newQty = Number(value);
      if (newQty > itemLine.batch.qty) {
        setErrorMessage(`Quantity exceeds stock limit (${itemLine.batch.qty}) for batch ${itemLine.batch.batchNo}.`);
      } else {
        setErrorMessage('');
      }
      itemLine.qty = newQty;
    } else if (field === 'rate') {
      itemLine.rate = Number(value) || 0;
    } else if (field === 'gst') {
      itemLine.gst = Number(value) || 0;
    }

    setLineItems(updated);
  };

  // Remove line item
  const handleRemoveLine = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Live Summary Calculations
  const subtotal = lineItems.reduce((acc, l) => acc + l.qty * l.rate, 0);
  const totalGst = lineItems.reduce((acc, l) => acc + (l.qty * l.rate * (l.gst || 0)) / 100, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const grandTotal = subtotal + totalGst;

  // Generate Bill submit
  const handleGenerateBill = async () => {
    setErrorMessage('');

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one item to generate a bill.');
      return;
    }

    // Client-side stock check
    for (const l of lineItems) {
      if (l.qty <= 0) {
        setErrorMessage(`Quantity for "${l.item.name}" must be greater than 0.`);
        return;
      }
      if (l.qty > l.batch.qty) {
        setErrorMessage(`Quantity for "${l.item.name}" exceeds available stock (${l.batch.qty}).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        billDate,
        customerName,
        customerPhone,
        paymentMode,
        items: lineItems.map((l) => ({
          itemId: l.item._id,
          batchId: l.batch._id,
          qty: l.qty,
          rate: l.rate,
          gst: l.gst,
        })),
      };

      const res = await createBill(payload);
      setCreatedBill(res.data);
      setIsPrintOpen(true);

      // Reset form on success
      setLineItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setBillDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error('Failed to generate bill:', err);
      setErrorMessage(err.response?.data?.error?.message || 'Failed to create bill. Please check stock levels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <Receipt className="w-6 h-6 text-accent" />
              <span>Sales Billing Terminal</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Create GST invoices, apply batch discounts, and print sales receipts.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-error/30 text-error text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs underline font-mono">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer Form & Item Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details Card */}
            <Card className="p-5 bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-secondary" />
                <span>Customer & Invoice Info</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name (Optional)</label>
                  <Input
                    placeholder="e.g. Ramesh Shah"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    <span>Bill Date *</span>
                  </label>
                  <Input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </Card>

            {/* Item Search & Batch Picker */}
            <Card className="p-5 bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-secondary" />
                <span>Search & Add Medicines / Items</span>
              </h3>

              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search medicine name or composition..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />

                  {/* Dropdown Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto">
                      {searchResults.map((item) => {
                        const totalQty = (item.batches || []).reduce((acc, b) => acc + (b.qty || 0), 0);

                        return (
                          <button
                            key={item._id}
                            onClick={() => handleSelectItem(item)}
                            className="w-full text-left p-3 hover:bg-teal-50/60 border-b border-gray-100 last:border-0 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-primary">{item.name}</p>
                              {item.composition && (
                                <p className="text-[10px] text-muted">{item.composition}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100">
                                Stock: {totalQty}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Item Batch & Add Bar */}
                {selectedItem && (
                  <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-primary">{selectedItem.name}</p>
                      <p className="text-[10px] text-muted">{selectedItem.composition || 'No composition'}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-48 text-xs font-mono bg-white"
                      >
                        <option value="">Select Batch...</option>
                        {(selectedItem.batches || []).map((b) => (
                          <option key={b._id} value={b._id} disabled={b.qty === 0}>
                            {b.batchNo} (Qty: {b.qty}, MRP: ₹{b.mrp})
                          </option>
                        ))}
                      </Select>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddLineItem}
                        disabled={!selectedBatchId}
                        className="gap-1 text-xs shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Added Line Items Table */}
            <Card className="p-5 bg-white/90">
              <h3 className="text-sm font-heading font-bold text-primary mb-4 flex items-center justify-between">
                <span>Invoice Line Items</span>
                <span className="text-xs font-mono text-muted">{lineItems.length} items added</span>
              </h3>

              {lineItems.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl">
                  <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500">No items added to bill yet.</p>
                  <p className="text-[10px] text-muted mt-1">Use the search box above to add medicines.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Batch No</TableHead>
                      <TableHead className="w-20 text-center font-mono">Qty</TableHead>
                      <TableHead className="w-24 text-right font-mono">Rate (₹)</TableHead>
                      <TableHead className="w-20 text-center font-mono">GST %</TableHead>
                      <TableHead className="text-right font-mono">Total (₹)</TableHead>
                      <TableHead className="w-10 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((line, idx) => {
                      const lineTotal = line.qty * line.rate;

                      return (
                        <TableRow key={idx} className="hover:bg-gray-50/50">
                          <TableCell className="font-semibold text-primary">
                            <div>
                              <span>{line.item.name}</span>
                              <span className="block text-[10px] text-muted font-normal">
                                Max Avail: {line.batch.qty}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs font-bold text-gray-700">
                            {line.batch.batchNo}
                          </TableCell>

                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="1"
                              max={line.batch.qty}
                              value={line.qty}
                              onChange={(e) => handleUpdateLine(idx, 'qty', e.target.value)}
                              className="w-16 h-8 text-center text-xs font-mono p-1"
                            />
                          </TableCell>

                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.rate}
                              onChange={(e) => handleUpdateLine(idx, 'rate', e.target.value)}
                              className="w-20 h-8 text-right text-xs font-mono p-1 ml-auto"
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={line.gst}
                              onChange={(e) => handleUpdateLine(idx, 'gst', e.target.value)}
                              className="w-16 h-8 text-center text-xs font-mono p-1 mx-auto"
                            />
                          </TableCell>

                          <TableCell className="text-right font-mono font-bold text-gray-900">
                            ₹{lineTotal.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-right">
                            <button
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 rounded text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                              title="Remove Line Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Right Column: Checkout Summary & Payment Mode */}
          <div className="space-y-6">
            <Card className="p-5 bg-white/90 border-t-4 border-t-primary sticky top-6">
              <h3 className="text-base font-heading font-bold text-primary mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                <span>Bill Summary & Checkout</span>
              </h3>

              {/* Summary Calculations */}
              <div className="space-y-3 font-mono text-xs border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal Amount:</span>
                  <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>CGST:</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST:</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-100 font-bold">
                  <span>Total Tax (GST):</span>
                  <span>₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-primary pt-3 border-t border-gray-300">
                  <span>Grand Total:</span>
                  <span className="text-lg text-primary">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-semibold text-gray-700">Payment Mode</label>
                <Select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs font-semibold bg-white"
                >
                  <option value="Cash">Cash Payment</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Credit">Store Credit / Khata</option>
                </Select>
              </div>

              {/* Submit CTA Button */}
              <Button
                variant="default"
                size="lg"
                onClick={handleGenerateBill}
                disabled={isSubmitting || lineItems.length === 0}
                className="w-full gap-2 font-bold py-3 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Processing Bill...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 text-accent" />
                    <span>Generate & Print Bill</span>
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>

        {/* Printable Bill Dialog */}
        <PrintableBill
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          bill={createdBill}
        />
      </div>
    </div>
  );
}

export default Billing;
