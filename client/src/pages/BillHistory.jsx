import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Calendar,
  RotateCcw
} from 'lucide-react';
import { getBills } from '@/services/billService';
import { createReturn } from '@/services/returnService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { PrintableBill } from '@/components/PrintableBill';
import { PrintableReturn } from '@/components/PrintableReturn';

export function BillHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Date Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Bill for Reprint
  const [selectedBill, setSelectedBill] = useState(null);

  // Customer Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [billToReturn, setBillToReturn] = useState(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('wrong_item');
  const [restocked, setRestocked] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Printable Return Slip state
  const [createdReturnRecord, setCreatedReturnRecord] = useState(null);
  const [isPrintReturnModalOpen, setIsPrintReturnModalOpen] = useState(false);

  const fetchBillsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await getBills(params);
      setBills(res.data || []);
    } catch (err) {
      console.error('Failed to fetch bills history:', err);
      setError('Failed to load bill history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, fromDate, toDate]);

  useEffect(() => {
    fetchBillsList();
  }, [fetchBillsList]);

  const handleOpenReturnModal = (bill) => {
    setBillToReturn(bill);
    setSelectedLineIndex(0);
    setCustomerName(bill.customerName || '');
    setCustomerPhone(bill.customerPhone || '');
    setReturnReason('wrong_item');
    setRestocked(true);
    setNotes('');

    const firstItem = (bill.items || [])[0];
    if (firstItem) {
      setReturnQty(1);
      setRefundAmount(Number(firstItem.mrp || 0));
    } else {
      setReturnQty(1);
      setRefundAmount(0);
    }

    setIsReturnModalOpen(true);
  };

  const handleLineItemChange = (indexStr) => {
    const idx = Number(indexStr);
    setSelectedLineIndex(idx);
    const lineItem = (billToReturn?.items || [])[idx];
    if (lineItem) {
      setReturnQty(1);
      setRefundAmount(Number(lineItem.mrp || 0));
    }
  };

  const handleQtyChange = (qtyVal) => {
    const q = Number(qtyVal) || 1;
    setReturnQty(q);
    const lineItem = (billToReturn?.items || [])[selectedLineIndex];
    if (lineItem) {
      setRefundAmount(q * Number(lineItem.mrp || 0));
    }
  };

  const handleReasonChange = (reasonVal) => {
    setReturnReason(reasonVal);
    if (['expired', 'damaged'].includes(reasonVal)) {
      setRestocked(false);
    } else {
      setRestocked(true);
    }
  };

  const handleConfirmCustomerReturn = async (e) => {
    e.preventDefault();
    if (!billToReturn) return;

    const lineItems = billToReturn.items || [];
    const selectedLine = lineItems[selectedLineIndex];
    if (!selectedLine) {
      alert('Please select an item from the bill to return.');
      return;
    }

    const numQty = Number(returnQty);
    if (isNaN(numQty) || numQty < 1 || numQty > selectedLine.qty) {
      alert(`Return quantity cannot exceed original sold quantity of ${selectedLine.qty}.`);
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const payload = {
        type: 'customer',
        referenceBillId: billToReturn._id,
        itemId: selectedLine.itemId?._id || selectedLine.itemId,
        batchId: selectedLine.batchId?._id || selectedLine.batchId,
        storeType: selectedLine.itemId?.storeType || billToReturn.storeType || 'medical',
        quantity: numQty,
        reason: returnReason,
        restocked,
        customerName,
        customerPhone,
        refundAmount: Number(refundAmount) || 0,
        returnDate: new Date().toISOString().split('T')[0],
        notes,
      };

      const res = await createReturn(payload);
      setIsReturnModalOpen(false);
      setBillToReturn(null);

      // Show printable return slip
      if (res.data) {
        setCreatedReturnRecord(res.data);
        setIsPrintReturnModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to record customer return:', err);
      alert(err.response?.data?.error?.message || 'Failed to process customer return.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
              <Receipt className="w-6 h-6 text-secondary" />
              <span>Sales Invoices & Bill History</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Search, filter, reprint, and process customer returns for sales invoices.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/80 p-4 rounded-2xl border border-gray-200 shadow-sm backdrop-blur-sm">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by Bill No or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-xs bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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
              onClick={fetchBillsList}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4-STATE PATTERN */}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Fetching sales invoices...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {!loading && error && (
          <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-error">Failed to Load History</h3>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchBillsList} className="mt-2">
              Retry
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && bills.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-teal-800">No Invoices Found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                No bills match your current search and date filter criteria.
              </p>
            </div>
          </Card>
        )}

        {/* STATE 4: POPULATED BILL HISTORY TABLE */}
        {!loading && !error && bills.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Bill Number</TableHead>
                <TableHead className="font-mono">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center font-mono">Items Count</TableHead>
                <TableHead className="text-center">Payment Mode</TableHead>
                <TableHead className="text-right font-mono">Total Amount (₹)</TableHead>
                <TableHead className="text-center">Print Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => {
                const isPrinted = bill.shareStatus?.printed;

                return (
                  <TableRow key={bill._id} className="hover:bg-gray-50/60">
                    <TableCell className="font-mono font-bold text-primary">{bill.billNo}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDate(bill.billDate)}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      <div>
                        <span>{bill.customerName || 'Cash Customer'}</span>
                        {bill.customerPhone && (
                          <span className="block text-xs font-mono text-muted">{bill.customerPhone}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold">
                      {(bill.items || []).length}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {bill.paymentMode || 'Cash'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-primary text-sm">
                      ₹{(bill.totalAmount || 0).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-center">
                      {isPrinted ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Printed</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Not Printed</span>
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReturnModal(bill)}
                          className="h-8 px-2.5 text-xs gap-1 border-blue-300 text-blue-800 hover:bg-blue-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Process Return</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBill(bill)}
                          className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Printable Bill Dialog */}
        <PrintableBill
          isOpen={Boolean(selectedBill)}
          onClose={() => setSelectedBill(null)}
          bill={selectedBill}
        />

        {/* Customer Return Dialog */}
        <Dialog
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title={`Process Return for Bill ${billToReturn?.billNo}`}
          description="Select item to return, adjust quantity, and record customer refund."
          className="max-w-md"
        >
          <form onSubmit={handleConfirmCustomerReturn} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="itemSelect">Select Line Item to Return</Label>
              <Select
                id="itemSelect"
                value={selectedLineIndex}
                onChange={(e) => handleLineItemChange(e.target.value)}
              >
                {(billToReturn?.items || []).map((itemLine, idx) => (
                  <option key={idx} value={idx}>
                    {itemLine.itemId?.name || 'Item'} (Batch: {itemLine.batchId?.batchNo || 'N/A'}) — Sold Qty: {itemLine.qty} @ ₹{itemLine.mrp}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="returnQty">Return Quantity</Label>
                <Input
                  id="returnQty"
                  type="number"
                  min="1"
                  max={(billToReturn?.items || [])[selectedLineIndex]?.qty || 1}
                  value={returnQty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="returnReason">Return Reason</Label>
                <Select
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  required
                >
                  <option value="wrong_item">Wrong Item Dispensed</option>
                  <option value="customer_dissatisfaction">Customer Return / Exchange</option>
                  <option value="expired">Expired Medicine</option>
                  <option value="damaged">Damaged / Broken Packaging</option>
                  <option value="other">Other Reason</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border rounded-lg">
              <input
                type="checkbox"
                id="restockedCheck"
                checked={restocked}
                onChange={(e) => setRestocked(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
              <Label htmlFor="restockedCheck" className="cursor-pointer text-xs font-medium">
                Restock item back to inventory (increments batch stock)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
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
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional return notes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={isSubmittingReturn}>
                {isSubmittingReturn ? 'Processing...' : 'Confirm Customer Return'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Printable Customer Return Slip Modal */}
        {createdReturnRecord && (
          <PrintableReturn
            isOpen={isPrintReturnModalOpen}
            onClose={() => {
              setIsPrintReturnModalOpen(false);
              setCreatedReturnRecord(null);
            }}
            returnRecord={createdReturnRecord}
          />
        )}
      </div>
    </div>
  );
}

export default BillHistory;
