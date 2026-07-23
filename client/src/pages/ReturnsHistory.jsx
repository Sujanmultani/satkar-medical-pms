import React, { useState, useEffect, useCallback } from 'react';
import { 
  Undo2, 
  Search, 
  Printer, 
  RefreshCw, 
  Plus, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getReturns, createReturn } from '@/services/returnService';
import { getItems } from '@/services/itemService';
import { getBatches } from '@/services/batchService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { PrintableReturn } from '@/components/PrintableReturn';

export function ReturnsHistory() {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'supplier' | 'customer'
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Return for Reprint
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Standalone New Return Modal State
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [newType, setNewType] = useState('supplier'); // 'supplier' | 'customer'
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [matchingItems, setMatchingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('expired');
  const [restocked, setRestocked] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [creditNoteNo, setCreditNoteNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturnsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await getReturns(params);
      setReturnsList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch returns history:', err);
      setError('Failed to load returns history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchTerm, fromDate, toDate]);

  useEffect(() => {
    fetchReturnsList();
  }, [fetchReturnsList]);

  // Search items for Standalone return form
  const handleSearchItems = async (query) => {
    setItemSearchTerm(query);
    if (!query.trim()) {
      setMatchingItems([]);
      return;
    }
    try {
      const res = await getItems({ search: query, limit: 10 });
      setMatchingItems(res.data || []);
    } catch (err) {
      console.error('Failed to search items:', err);
    }
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    setItemSearchTerm(item.name);
    setMatchingItems([]);

    try {
      const res = await getBatches(item._id);
      const activeBatches = res.data || [];
      setAvailableBatches(activeBatches);
      if (activeBatches.length > 0) {
        setSelectedBatch(activeBatches[0]);
        setRefundAmount(activeBatches[0].mrp || 0);
      } else {
        setSelectedBatch(null);
        setRefundAmount(0);
      }
    } catch (err) {
      console.error('Failed to fetch batches for item:', err);
    }
  };

  const handleBatchSelectChange = (batchId) => {
    const found = availableBatches.find((b) => b._id === batchId);
    setSelectedBatch(found || null);
    if (found) {
      setRefundAmount((quantity || 1) * (found.mrp || 0));
    }
  };

  const handleTypeChange = (t) => {
    setNewType(t);
    if (t === 'supplier') {
      setReason('expired');
      setRestocked(false);
    } else {
      setReason('wrong_item');
      setRestocked(true);
    }
  };

  const handleCreateNewReturn = async (e) => {
    e.preventDefault();
    if (!selectedItem || !selectedBatch) {
      alert('Please search and select an item and batch.');
      return;
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty < 1) {
      alert('Please enter a valid return quantity.');
      return;
    }

    if (newType === 'supplier' && numQty > selectedBatch.qty) {
      alert(`Cannot return ${numQty} units. Only ${selectedBatch.qty} available in batch ${selectedBatch.batchNo}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: newType,
        itemId: selectedItem._id,
        batchId: selectedBatch._id,
        storeType: selectedItem.storeType || 'medical',
        quantity: numQty,
        reason,
        restocked: newType === 'supplier' ? false : restocked,
        returnDate,
        supplierName,
        creditNoteNo,
        customerName,
        customerPhone,
        refundAmount: newType === 'customer' ? Number(refundAmount) || 0 : 0,
        notes,
      };

      const res = await createReturn(payload);
      setIsNewReturnOpen(false);
      resetForm();
      fetchReturnsList();

      if (res.data) {
        setSelectedReturn(res.data);
      }
    } catch (err) {
      console.error('Failed to record return:', err);
      alert(err.response?.data?.error?.message || 'Failed to record return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setSelectedBatch(null);
    setItemSearchTerm('');
    setMatchingItems([]);
    setQuantity(1);
    setSupplierName('');
    setCreditNoteNo('');
    setCustomerName('');
    setCustomerPhone('');
    setRefundAmount(0);
    setNotes('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const reasonLabels = {
    expired: 'Expired Stock',
    damaged: 'Damaged Goods',
    wrong_item: 'Wrong Item',
    customer_dissatisfaction: 'Customer Return',
    other: 'Other',
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
              <Undo2 className="w-6 h-6 text-secondary" />
              <span>Returns Management History</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Audit log of supplier returns and customer medicine returns with printable vouchers.
            </p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              resetForm();
              setIsNewReturnOpen(true);
            }}
            className="gap-2 self-start sm:self-auto shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Record Standalone Return</span>
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/80 p-4 rounded-2xl border border-gray-200 shadow-sm backdrop-blur-sm">
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-full lg:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Returns
            </button>
            <button
              onClick={() => setTypeFilter('supplier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'supplier' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Supplier Returns
            </button>
            <button
              onClick={() => setTypeFilter('customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'customer' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer Returns
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search Return No, Supplier, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-xs bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 text-xs font-mono bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 text-xs font-mono bg-white"
              />
            </div>

            <button
              onClick={fetchReturnsList}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4-STATE PATTERN */}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Loading returns audit log...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {!loading && error && (
          <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="w-8 h-8 text-error" />
            <div>
              <h3 className="text-base font-bold text-error">Failed to Load Returns</h3>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchReturnsList} className="mt-2">
              Retry
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && returnsList.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Undo2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-teal-800">No returns recorded yet</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Recorded supplier returns or customer return receipts will appear here.
              </p>
            </div>
          </Card>
        )}

        {/* STATE 4: POPULATED DATA TABLE */}
        {!loading && !error && returnsList.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Return No</TableHead>
                <TableHead className="font-mono">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item & Batch</TableHead>
                <TableHead className="text-center font-mono">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Party Details</TableHead>
                <TableHead className="text-center">Restocked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnsList.map((ret) => {
                const isSupplier = ret.type === 'supplier';
                const item = ret.itemId || {};
                const batch = ret.batchId || {};

                return (
                  <TableRow key={ret._id} className="hover:bg-gray-50/60">
                    <TableCell className="font-mono font-bold text-primary">{ret.returnNo}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDate(ret.returnDate)}</TableCell>

                    <TableCell>
                      <Badge variant={isSupplier ? 'secondary' : 'default'} className={isSupplier ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300'}>
                        {isSupplier ? 'Supplier Return' : 'Customer Return'}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-medium text-gray-900">
                      <div>
                        <span>{item.name || 'Unknown Item'}</span>
                        <span className="block text-xs font-mono text-muted">Batch: {batch.batchNo || 'N/A'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-sm">{ret.quantity}</TableCell>

                    <TableCell className="text-xs font-medium">
                      {reasonLabels[ret.reason] || ret.reason}
                    </TableCell>

                    <TableCell className="text-xs">
                      {isSupplier ? (
                        <div>
                          <span className="font-semibold text-gray-900">{ret.supplierName || 'N/A'}</span>
                          {ret.creditNoteNo && <span className="block text-[11px] font-mono text-muted">CN: {ret.creditNoteNo}</span>}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-gray-900">{ret.customerName || 'Walk-in Customer'}</span>
                          {ret.refundAmount > 0 && <span className="block text-[11px] font-mono text-emerald-700 font-bold">Refund: ₹{ret.refundAmount.toFixed(2)}</span>}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={ret.restocked ? 'success' : 'outline'} className="text-[11px]">
                        {ret.restocked ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReturn(ret)}
                        className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Standalone New Return Dialog */}
        <Dialog
          isOpen={isNewReturnOpen}
          onClose={() => setIsNewReturnOpen(false)}
          title="Record Standalone Return"
          description="Create a return record for items without opening a prior bill."
          className="max-w-lg"
        >
          <form onSubmit={handleCreateNewReturn} className="space-y-4 text-xs">
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('supplier')}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
                  newType === 'supplier' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                Supplier Return
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('customer')}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all ${
                  newType === 'customer' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                Customer Return
              </button>
            </div>

            {/* Item Search */}
            <div className="relative">
              <Label htmlFor="itemSearch">Search Medicine / Item</Label>
              <Input
                id="itemSearch"
                placeholder="Type item name..."
                value={itemSearchTerm}
                onChange={(e) => handleSearchItems(e.target.value)}
                required
              />

              {matchingItems.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y">
                  {matchingItems.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleSelectItem(item)}
                      className="p-2.5 hover:bg-teal-50 cursor-pointer"
                    >
                      <p className="font-semibold text-primary">{item.name}</p>
                      {item.composition && <p className="text-[11px] text-muted">{item.composition}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Select */}
            {selectedItem && (
              <div>
                <Label htmlFor="batchSelect">Select Batch</Label>
                {availableBatches.length > 0 ? (
                  <Select
                    id="batchSelect"
                    value={selectedBatch?._id || ''}
                    onChange={(e) => handleBatchSelectChange(e.target.value)}
                    required
                  >
                    {availableBatches.map((b) => (
                      <option key={b._id} value={b._id}>
                        Batch: {b.batchNo} | Available Qty: {b.qty} | Exp: {formatDate(b.expiryDate)} | MRP: ₹{b.mrp}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-error text-xs">No active batches available for this item.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={newType === 'supplier' ? selectedBatch?.qty || 1 : undefined}
                  value={quantity}
                  onChange={(e) => {
                    const q = Number(e.target.value) || 1;
                    setQuantity(q);
                    if (selectedBatch) setRefundAmount(q * (selectedBatch.mrp || 0));
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Select
                  id="reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (['expired', 'damaged'].includes(e.target.value)) setRestocked(false);
                    else if (newType === 'customer') setRestocked(true);
                  }}
                  required
                >
                  {newType === 'supplier' ? (
                    <>
                      <option value="expired">Expired Stock</option>
                      <option value="damaged">Damaged Goods</option>
                      <option value="other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="customer_dissatisfaction">Customer Return</option>
                      <option value="expired">Expired Medicine</option>
                      <option value="damaged">Damaged Packaging</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </Select>
              </div>
            </div>

            {newType === 'supplier' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    placeholder="e.g. Cipla Distributors"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="creditNoteNo">Credit Note No</Label>
                  <Input
                    id="creditNoteNo"
                    placeholder="e.g. CN-1029"
                    value={creditNoteNo}
                    onChange={(e) => setCreditNoteNo(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="e.g. Anand Shah"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="refundAmount">Refund Amount (₹)</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restocked}
                        onChange={(e) => setRestocked(e.target.checked)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span>Restock item to batch</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="returnDate">Return Date</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Input
                  id="notes"
                  placeholder="Optional details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewReturnOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={isSubmitting || !selectedBatch}>
                {isSubmitting ? 'Recording...' : 'Record Return'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Printable Return Slip */}
        <PrintableReturn
          isOpen={Boolean(selectedReturn)}
          onClose={() => setSelectedReturn(null)}
          returnRecord={selectedReturn}
        />
      </div>
    </div>
  );
}

export default ReturnsHistory;
