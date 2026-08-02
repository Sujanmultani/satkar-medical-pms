import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Calendar,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { getBills, deleteBill } from '@/services/billService';
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
  const [returnItemsMap, setReturnItemsMap] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Printable Return Slip state
  const [createdReturnRecord, setCreatedReturnRecord] = useState(null);
  const [isPrintReturnModalOpen, setIsPrintReturnModalOpen] = useState(false);

  // Delete Bill State
  const [billToDelete, setBillToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExecuteDelete = async (shouldRestock) => {
    if (!billToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteBill(billToDelete._id, { restock: shouldRestock });
      setIsDeleteModalOpen(false);
      setBillToDelete(null);
      fetchBillsList();
      const msg = res.message || (shouldRestock ? 'Bill deleted and stock restored.' : 'Bill deleted, stock unchanged.');
      alert(msg);
    } catch (err) {
      console.error('Failed to delete bill:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete bill. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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
    setCustomerName(bill.customerName || '');
    setCustomerPhone(bill.customerPhone || '');
    setNotes('');

    const items = bill.items || [];
    const initialMap = {};
    let firstAvailIdx = -1;

    items.forEach((itemLine, idx) => {
      const maxQty = itemLine.maxReturnableQty ?? (itemLine.qty - (itemLine.returnedQty || 0));
      const isAvailable = maxQty > 0;

      if (firstAvailIdx === -1 && isAvailable) {
        firstAvailIdx = idx;
      }

      initialMap[idx] = {
        selected: false,
        returnQty: isAvailable ? 1 : 0,
        reason: 'wrong_item',
        restocked: true,
      };
    });

    if (firstAvailIdx !== -1) {
      initialMap[firstAvailIdx].selected = true;
    }

    setReturnItemsMap(initialMap);

    let sum = 0;
    items.forEach((itemLine, idx) => {
      if (initialMap[idx]?.selected) {
        sum += (initialMap[idx].returnQty || 1) * Number(itemLine.mrp || itemLine.rate || 0);
      }
    });
    setRefundAmount(Math.round(sum * 100) / 100);

    setIsReturnModalOpen(true);
  };

  const recalculateRefund = (map, bill) => {
    const b = bill || billToReturn;
    let sum = 0;
    (b?.items || []).forEach((itemLine, idx) => {
      const st = map[idx];
      if (st && st.selected) {
        sum += (Number(st.returnQty) || 0) * Number(itemLine.mrp || itemLine.rate || 0);
      }
    });
    setRefundAmount(Math.round(sum * 100) / 100);
  };

  const handleToggleItemSelection = (idx) => {
    setReturnItemsMap((prev) => {
      const current = prev[idx] || {};
      const nextItem = { ...current, selected: !current.selected };
      const nextMap = { ...prev, [idx]: nextItem };
      recalculateRefund(nextMap);
      return nextMap;
    });
  };

  const handleItemReturnFieldChange = (idx, field, value) => {
    setReturnItemsMap((prev) => {
      const current = prev[idx] || {};
      const itemLine = (billToReturn?.items || [])[idx];
      const maxQty = itemLine ? (itemLine.maxReturnableQty ?? (itemLine.qty - (itemLine.returnedQty || 0))) : 1;

      let updatedVal = value;
      let updatedRestocked = current.restocked;

      if (field === 'returnQty') {
        let q = Number(value) || 1;
        if (q > maxQty) q = maxQty;
        if (q < 1 && maxQty > 0) q = 1;
        updatedVal = q;
      } else if (field === 'reason') {
        const isDamagedOrExpired = ['expired', 'damaged'].includes(value);
        updatedRestocked = !isDamagedOrExpired;
      }

      const nextItem = { ...current, [field]: updatedVal, restocked: updatedRestocked };
      const nextMap = { ...prev, [idx]: nextItem };
      recalculateRefund(nextMap);
      return nextMap;
    });
  };

  const handleConfirmCustomerReturn = async (e) => {
    e.preventDefault();
    if (!billToReturn) return;

    const lineItems = billToReturn.items || [];
    const selectedIndices = Object.keys(returnItemsMap).filter((idx) => returnItemsMap[idx]?.selected);

    if (selectedIndices.length === 0) {
      alert('Please select at least one medicine item to return.');
      return;
    }

    for (const idxStr of selectedIndices) {
      const idx = Number(idxStr);
      const line = lineItems[idx];
      const state = returnItemsMap[idx];
      const maxAllowed = line.maxReturnableQty ?? (line.qty - (line.returnedQty || 0));

      if (maxAllowed <= 0) {
        alert(`"${line.itemId?.name || 'Item'}" has already been fully returned.`);
        return;
      }
      if (!state.returnQty || state.returnQty < 1 || state.returnQty > maxAllowed) {
        alert(`Return quantity for "${line.itemId?.name || 'Item'}" must be between 1 and ${maxAllowed}.`);
        return;
      }
    }

    setIsSubmittingReturn(true);
    try {
      const createdRecords = [];

      for (const idxStr of selectedIndices) {
        const idx = Number(idxStr);
        const selectedLine = lineItems[idx];
        const state = returnItemsMap[idx];
        const lineRefund = (Number(state.returnQty) || 0) * Number(selectedLine.mrp || selectedLine.rate || 0);

        const payload = {
          type: 'customer',
          referenceBillId: billToReturn._id,
          itemId: selectedLine.itemId?._id || selectedLine.itemId,
          batchId: selectedLine.batchId?._id || selectedLine.batchId,
          storeType: selectedLine.itemId?.storeType || billToReturn.storeType || 'medical',
          quantity: Number(state.returnQty),
          reason: state.reason || 'wrong_item',
          restocked: Boolean(state.restocked),
          customerName,
          customerPhone,
          refundAmount: Number(lineRefund) || 0,
          returnDate: new Date().toISOString().split('T')[0],
          notes: notes ? `${notes} (Bill ${billToReturn.billNo})` : `Customer Return (Bill ${billToReturn.billNo})`,
        };

        const res = await createReturn(payload);
        if (res.data) createdRecords.push(res.data);
      }

      setIsReturnModalOpen(false);
      setBillToReturn(null);

      fetchBillsList();

      if (createdRecords.length > 0) {
        setCreatedReturnRecord(createdRecords.length === 1 ? createdRecords[0] : createdRecords);
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
                      <div>
                        <span>₹{(bill.totalAmount || 0).toFixed(2)}</span>
                        {bill.isFullyReturned ? (
                          <span className="block text-[10px] text-amber-800 font-semibold font-sans font-bold">(Fully Returned)</span>
                        ) : bill.isPartiallyReturned ? (
                          <span className="block text-[10px] text-amber-700 font-semibold font-sans">(Partial Return)</span>
                        ) : null}
                      </div>
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
                        {bill.isFullyReturned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={true}
                            className="h-8 px-2.5 text-xs gap-1 border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed opacity-80"
                            title="All items in this bill have been returned"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Returned</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReturnModal(bill)}
                            className="h-8 px-2.5 text-xs gap-1 border-blue-300 text-blue-800 hover:bg-blue-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{bill.isPartiallyReturned ? 'Return Remaining' : 'Process Return'}</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBill(bill)}
                          className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBillToDelete(bill);
                            setIsDeleteModalOpen(true);
                          }}
                          className="h-8 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

        {/* Customer Return Dialog (Supports Multi-Medicine Selection) */}
        <Dialog
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title={`Process Return for Bill ${billToReturn?.billNo}`}
          description="Check one or multiple medicines to return, adjust quantities, and confirm refund."
          className="max-w-2xl"
        >
          <form onSubmit={handleConfirmCustomerReturn} className="space-y-4 text-xs">
            {/* Medicines List */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary">Select Medicines to Return:</Label>
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {(billToReturn?.items || []).map((itemLine, idx) => {
                  const maxQty = itemLine.maxReturnableQty ?? (itemLine.qty - (itemLine.returnedQty || 0));
                  const isLineFullyReturned = maxQty <= 0;
                  const itemState = returnItemsMap[idx] || {};

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-colors ${
                        isLineFullyReturned
                          ? 'bg-gray-100/70 border-gray-200 opacity-60'
                          : itemState.selected
                          ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={itemState.selected || false}
                          disabled={isLineFullyReturned}
                          onChange={() => handleToggleItemSelection(idx)}
                          className="w-4 h-4 mt-0.5 text-primary rounded cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="flex-1 space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <span className="font-bold text-primary text-sm">{itemLine.itemId?.name || 'Item'}</span>
                              <span className="ml-2 font-mono text-[11px] text-gray-600 font-semibold">
                                (Batch: {itemLine.batchId?.batchNo || 'N/A'})
                              </span>
                            </div>

                            <div className="font-mono text-xs">
                              {isLineFullyReturned ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600">
                                  FULLY RETURNED
                                </span>
                              ) : (
                                <span className="text-gray-700">
                                  Sold: <strong className="text-primary">{itemLine.qty}</strong>
                                  {itemLine.returnedQty > 0 && <span> | Returned: <strong>{itemLine.returnedQty}</strong></span>}
                                  | Max Returnable: <strong className="text-emerald-700">{maxQty}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Options when checked */}
                          {itemState.selected && !isLineFullyReturned && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-blue-200/80">
                              <div>
                                <Label htmlFor={`qty-${idx}`} className="text-[11px] font-semibold text-gray-700">
                                  Return Qty (Max {maxQty})
                                </Label>
                                <Input
                                  id={`qty-${idx}`}
                                  type="number"
                                  min="1"
                                  max={maxQty}
                                  value={itemState.returnQty || 1}
                                  onChange={(e) => handleItemReturnFieldChange(idx, 'returnQty', e.target.value)}
                                  className="h-8 text-xs font-mono bg-white mt-1"
                                  required
                                />
                              </div>

                              <div>
                                <Label htmlFor={`reason-${idx}`} className="text-[11px] font-semibold text-gray-700">
                                  Return Reason
                                </Label>
                                <Select
                                  id={`reason-${idx}`}
                                  value={itemState.reason || 'wrong_item'}
                                  onChange={(e) => handleItemReturnFieldChange(idx, 'reason', e.target.value)}
                                  className="h-8 text-xs bg-white mt-1"
                                >
                                  <option value="wrong_item">Wrong Item Dispensed</option>
                                  <option value="customer_dissatisfaction">Customer Return / Exchange</option>
                                  <option value="expired">Expired Medicine</option>
                                  <option value="damaged">Damaged / Broken Packaging</option>
                                  <option value="other">Other Reason</option>
                                </Select>
                              </div>

                              <div className="flex items-center gap-2 pt-5">
                                <input
                                  type="checkbox"
                                  id={`restock-${idx}`}
                                  checked={itemState.restocked ?? true}
                                  onChange={(e) => handleItemReturnFieldChange(idx, 'restocked', e.target.checked)}
                                  className="w-3.5 h-3.5 text-primary rounded cursor-pointer"
                                />
                                <Label htmlFor={`restock-${idx}`} className="cursor-pointer text-[11px] font-medium text-gray-800">
                                  Restock (+Stock)
                                </Label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Meta & Refund Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="refundAmount">Total Refund Amount (₹)</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                  className="mt-1 font-mono font-bold text-primary"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional return notes"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmittingReturn || Object.keys(returnItemsMap).filter(k => returnItemsMap[k]?.selected).length === 0}
              >
                {isSubmittingReturn
                  ? 'Processing...'
                  : `Confirm Customer Return (${Object.keys(returnItemsMap).filter(k => returnItemsMap[k]?.selected).length} Selected)`}
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

        {/* Delete Confirmation Dialog with 3 options */}
        <Dialog
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setBillToDelete(null);
            }
          }}
          title={`Delete Bill ${billToDelete?.billNo}?`}
          description="Choose whether to restore inventory stock or delete without modifying stock."
          className="max-w-md"
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-1 font-sans">
              <p className="font-bold">⚠️ Warning: Permanent Action</p>
              <p>Deleting bill <strong>{billToDelete?.billNo}</strong> cannot be undone. Please select how you want to handle inventory stock:</p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Delete & Restore Stock */}
              <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 text-xs">Option 1: Delete & Restore Stock</span>
                  <Badge variant="success" className="text-[10px]">Restock</Badge>
                </div>
                <p className="text-[11px] text-gray-600">
                  Use this if the bill was a mistake or duplicate entry — sold items will be added back to inventory stock.
                </p>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleExecuteDelete(true)}
                  className="w-full h-8 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete & Restore Stock (+Stock)'}
                </Button>
              </div>

              {/* Option 2: Delete without Restoring Stock */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs">Option 2: Delete without Restoring Stock</span>
                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800">Keep Stock</Badge>
                </div>
                <p className="text-[11px] text-gray-600">
                  Use this if items were genuinely given out — only the bill record is deleted, current stock stays unchanged.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleExecuteDelete(false)}
                  className="w-full h-8 text-xs font-semibold border-amber-400 text-amber-900 hover:bg-amber-100"
                >
                  {isDeleting ? 'Deleting...' : 'Delete without Restoring Stock'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBillToDelete(null);
                }}
                className="h-8 text-xs text-gray-600 hover:text-gray-900"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

export default BillHistory;
