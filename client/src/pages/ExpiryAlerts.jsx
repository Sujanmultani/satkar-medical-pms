import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Filter,
  Undo2,
  Building2,
  Pencil,
  Printer
} from 'lucide-react';
import { getExpiringSoon, getExpired, getBatchesByMonth, deleteBatch, updateBatch } from '@/services/batchService';
import { createReturn } from '@/services/returnService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog } from '@/components/ui/Dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PrintableReturn } from '@/components/PrintableReturn';
import { PrintableExpiryReport } from '@/components/PrintableExpiryReport';
import { SupplierAutocomplete } from '@/components/SupplierAutocomplete';

export function ExpiryAlerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'expired' ? 'expired' : tabParam === 'monthly' ? 'monthly' : 'expiring';

  const [activeTab, setActiveTab] = useState(initialTab); // 'expiring' | 'expired' | 'monthly'
  const [storeType, setStoreType] = useState('all'); // 'all' | 'medical' | 'provision'
  const [filterDate, setFilterDate] = useState(''); // Filter by target expiry date

  // Monthly report state
  const getCurrentYearMonth = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [isReportPrintModalOpen, setIsReportPrintModalOpen] = useState(false);

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Expiry Date modal state
  const [isEditExpiryModalOpen, setIsEditExpiryModalOpen] = useState(false);
  const [batchToEditExpiry, setBatchToEditExpiry] = useState(null);
  const [editMfgDate, setEditMfgDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);

  // Supplier Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [batchToReturn, setBatchToReturn] = useState(null);
  const [supplierName, setSupplierName] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('expired');
  const [creditNoteNo, setCreditNoteNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Print slip state
  const [createdReturnRecord, setCreatedReturnRecord] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const getMonthOffset = (offsetMonths) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offsetMonths);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const formatMonthLabel = (yearMonthStr) => {
    if (!yearMonthStr) return '';
    const [y, m] = yearMonthStr.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return isNaN(date.getTime())
      ? yearMonthStr
      : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = storeType !== 'all' ? { storeType } : {};
      let res;
      if (activeTab === 'monthly') {
        res = await getBatchesByMonth({ ...params, month: selectedMonth });
      } else if (activeTab === 'expiring') {
        res = await getExpiringSoon({ ...params, limit: 1000 });
      } else {
        res = await getExpired({ ...params, limit: 1000 });
      }
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to load expiry alerts:', err);
      setError('Failed to load expiry records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, storeType, selectedMonth]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBatch(batchToDelete._id);
      setIsDeleteModalOpen(false);
      setBatchToDelete(null);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to delete batch:', err);
      alert('Failed to dispose batch. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateForInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleOpenEditExpiry = (batch) => {
    setBatchToEditExpiry(batch);
    setEditMfgDate(formatDateForInput(batch.mfgDate));
    setEditExpiryDate(formatDateForInput(batch.expiryDate));
    setIsEditExpiryModalOpen(true);
  };

  const handleSaveExpiryDate = async (e) => {
    e.preventDefault();
    if (!batchToEditExpiry) return;

    if (!editExpiryDate) {
      alert('Expiry date is required.');
      return;
    }

    setIsSavingExpiry(true);
    try {
      await updateBatch(batchToEditExpiry._id, {
        expiryDate: editExpiryDate,
        mfgDate: editMfgDate || null,
      });
      setIsEditExpiryModalOpen(false);
      setBatchToEditExpiry(null);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update expiry date:', err);
      alert(err.response?.data?.error?.message || 'Failed to update expiry date. Please try again.');
    } finally {
      setIsSavingExpiry(false);
    }
  };

  const handleOpenReturnModal = (batch) => {
    setBatchToReturn(batch);
    setReturnQty(batch.qty || 1);
    setSupplierName(batch.supplierId?.name || '');
    setReturnReason('expired');
    setCreditNoteNo('');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsReturnModalOpen(true);
  };

  const handleConfirmSupplierReturn = async (e) => {
    e.preventDefault();
    if (!batchToReturn) return;

    const numQty = Number(returnQty);
    if (isNaN(numQty) || numQty < 1 || numQty > batchToReturn.qty) {
      alert(`Return quantity must be between 1 and ${batchToReturn.qty}.`);
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const payload = {
        type: 'supplier',
        itemId: batchToReturn.itemId?._id || batchToReturn.itemId,
        batchId: batchToReturn._id,
        storeType: batchToReturn.itemId?.storeType || 'medical',
        quantity: numQty,
        reason: returnReason,
        returnDate,
        supplierName,
        creditNoteNo,
        notes,
      };

      const res = await createReturn(payload);
      setIsReturnModalOpen(false);
      setBatchToReturn(null);
      fetchAlerts();

      // Show printable slip
      if (res.data) {
        setCreatedReturnRecord(res.data);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to create supplier return:', err);
      alert(err.response?.data?.error?.message || 'Failed to record supplier return.');
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

  const displayedBatches = batches.filter((b) => {
    if (activeTab === 'monthly') return true;
    if (!filterDate) return true;
    if (!b.expiryDate) return false;
    const batchExpDate = new Date(b.expiryDate);
    const targetDate = new Date(filterDate);
    if (isNaN(batchExpDate.getTime()) || isNaN(targetDate.getTime())) return true;
    
    batchExpDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    return batchExpDate <= targetDate;
  });

  const monthlyMetrics = useMemo(() => {
    const totalItems = displayedBatches.length;
    const totalQty = displayedBatches.reduce((acc, b) => acc + (Number(b.qty) || 0), 0);
    const totalValue = displayedBatches.reduce(
      (acc, b) => acc + (Number(b.qty) || 0) * (Number(b.mrp) || 0),
      0
    );
    return { totalItems, totalQty, totalValue };
  }, [displayedBatches]);

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background">
      {/* Prominent Logo Watermark backdrop */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <span>Expiry Management Alerts</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Track expiring batches by month, print audit sheets, and record supplier returns or disposals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsReportPrintModalOpen(true)}
              disabled={loading || displayedBatches.length === 0}
              className="gap-2 bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm"
              title="Print Current Expiry List"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Expiry List</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAlerts}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Alerts</span>
            </Button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-3 rounded-2xl border border-gray-200 shadow-sm backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl">
            <button
              onClick={() => handleTabChange('expiring')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'expiring'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expiring Soon (30 Days)</span>
            </button>

            <button
              onClick={() => handleTabChange('expired')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'expired'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Already Expired</span>
            </button>

            <button
              onClick={() => handleTabChange('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monthly Expiry Report</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
            {/* Target Expiry Date Filter Input (for expiring/expired tabs) */}
            {activeTab !== 'monthly' && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                <Label htmlFor="filterDate" className="text-xs font-semibold text-gray-700 whitespace-nowrap">Target Date:</Label>
                <Input
                  id="filterDate"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-36 text-xs py-1 h-7 font-mono bg-white"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="text-xs font-medium text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
                    title="Clear date filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <Select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                className="w-36 text-xs py-1.5"
              >
                <option value="all">All Stores</option>
                <option value="medical">Pharmacy Only</option>
                <option value="provision">Provision Store</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Monthly Controls Banner (Visible on 'monthly' tab) */}
        {activeTab === 'monthly' && (
          <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-blue-50/80 p-4 rounded-2xl border border-teal-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Month picker & Quick jump pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-teal-200 shadow-xs">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Label htmlFor="monthSelect" className="text-xs font-bold text-gray-800 whitespace-nowrap">
                    Select Month:
                  </Label>
                  <Input
                    id="monthSelect"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                    className="w-40 text-xs py-1 h-8 font-semibold text-primary bg-slate-50 border-gray-300"
                  />
                </div>

                {/* Quick jump pills */}
                <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-teal-100 text-xs">
                  {[
                    { label: 'This Month', offset: 0 },
                    { label: 'Next Month', offset: 1 },
                    { label: '+2 Months', offset: 2 },
                  ].map(({ label, offset }) => {
                    const mVal = getMonthOffset(offset);
                    const isSelected = selectedMonth === mVal;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setSelectedMonth(mVal)}
                        className={`px-3 py-1 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs font-bold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {label} ({formatMonthLabel(mVal).split(' ')[0]})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prominent Print Monthly List Button */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsReportPrintModalOpen(true)}
                disabled={loading || displayedBatches.length === 0}
                className="gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-sm self-start md:self-auto h-9 px-4"
              >
                <Printer className="w-4 h-4" />
                <span>Print {formatMonthLabel(selectedMonth).split(' ')[0]} Expiry List</span>
              </Button>
            </div>

            {/* Metric mini-cards for selected month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase">Expiring Batches</p>
                  <p className="text-lg font-bold text-gray-900 font-mono leading-none mt-0.5">
                    {monthlyMetrics.totalItems} <span className="text-xs font-normal text-muted">medicines</span>
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase">Total Stock Quantity</p>
                  <p className="text-lg font-bold text-gray-900 font-mono leading-none mt-0.5">
                    {monthlyMetrics.totalQty} <span className="text-xs font-normal text-muted">units</span>
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-teal-100 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted uppercase">Total MRP at Risk</p>
                  <p className="text-lg font-bold text-rose-700 font-mono leading-none mt-0.5">
                    ₹{monthlyMetrics.totalValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            <p className="text-xs text-muted font-medium">Checking batch expiration records...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {error && !loading && (
          <Card className="p-8 text-center flex flex-col items-center justify-center gap-3 bg-red-50/80 border-red-200">
            <AlertTriangle className="w-8 h-8 text-error" />
            <p className="text-sm font-semibold text-error">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAlerts}>
              Try Again
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && displayedBatches.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-teal-800">
                {activeTab === 'monthly'
                  ? `No Batches Expiring in ${formatMonthLabel(selectedMonth)}`
                  : filterDate
                  ? `No Batches Expiring On or Before ${formatDate(filterDate)}`
                  : activeTab === 'expiring'
                  ? 'All Stock is Fresh!'
                  : 'No Expired Batches'}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {activeTab === 'monthly'
                  ? `There are no medicines or items in inventory set to expire during ${formatMonthLabel(selectedMonth)}.`
                  : filterDate
                  ? `There are no batches matching the selected target expiry date ${formatDate(filterDate)}.`
                  : activeTab === 'expiring'
                  ? 'No items or batches are set to expire in the next 30 days.'
                  : 'There are zero expired batches in your inventory.'}
              </p>
            </div>
          </Card>
        )}

        {/* STATE 4: POPULATED DATA TABLE */}
        {!loading && !error && displayedBatches.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="font-mono">Expiry Date</TableHead>
                <TableHead className="text-center font-mono">Stock Qty</TableHead>
                <TableHead className="text-right font-mono">MRP (₹)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedBatches.map((batch) => {
                const item = batch.itemId || {};
                const isBatchExpired = batch.status === 'expired' || (batch.expiryDate && new Date(batch.expiryDate) < new Date());

                return (
                  <TableRow
                    key={batch._id}
                    className={
                      isBatchExpired
                        ? 'bg-red-50/30 border-l-4 border-l-red-500'
                        : batch.status === 'expiring_soon'
                        ? 'bg-amber-50/30 border-l-4 border-l-amber-400'
                        : 'bg-emerald-50/15 border-l-4 border-l-emerald-400'
                    }
                  >
                    <TableCell className="font-semibold text-primary">
                      <div>
                        <span>{item.name || 'Unnamed Item'}</span>
                        {item.composition && (
                          <p className="text-xs text-muted font-normal mt-0.5">{item.composition}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={item.storeType === 'medical' ? 'default' : 'secondary'}>
                        {item.storeType === 'medical' ? 'Pharmacy' : 'Provision'}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono font-semibold text-primary">{batch.batchNo}</TableCell>

                    <TableCell className="text-xs text-gray-700 font-medium">
                      {batch.supplierId?.name ? (
                        <div className="flex items-center gap-1.5 font-sans">
                          <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="truncate max-w-[140px]" title={batch.supplierId.name}>{batch.supplierId.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-mono">—</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(batch.expiryDate)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-sm">{batch.qty}</TableCell>

                    <TableCell className="text-right font-mono font-medium text-gray-900">
                      ₹{(batch.mrp || 0).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-center">
                      {isBatchExpired ? (
                        <Badge variant="expired">Expired</Badge>
                      ) : batch.status === 'expiring_soon' ? (
                        <Badge variant="expiring_soon">Expiring Soon</Badge>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditExpiry(batch)}
                          className="h-8 px-2.5 text-xs gap-1 border-secondary/40 hover:bg-secondary/10 text-secondary-dark"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit Expiry</span>
                        </Button>

                        {isBatchExpired && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReturnModal(batch)}
                              className="h-8 px-2.5 text-xs gap-1 border-amber-300 hover:bg-amber-50 text-amber-800"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Return to Supplier</span>
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setBatchToDelete(batch);
                                setIsDeleteModalOpen(true);
                              }}
                              className="h-8 px-2.5 text-xs gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Dispose</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setBatchToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title={`Dispose Expired Batch "${batchToDelete?.batchNo}"?`}
          message={`Are you sure you want to permanently delete batch "${batchToDelete?.batchNo}" (${batchToDelete?.itemId?.name})? This action removes expired stock from your system.`}
        />

        {/* Edit Expiry Date Modal */}
        <Dialog
          isOpen={isEditExpiryModalOpen}
          onClose={() => {
            setIsEditExpiryModalOpen(false);
            setBatchToEditExpiry(null);
          }}
          title={`Edit Expiry Date — Batch ${batchToEditExpiry?.batchNo || ''}`}
          description="Correct a wrongly entered manufacturing or expiry date for this batch."
          className="max-w-md"
        >
          <form onSubmit={handleSaveExpiryDate} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="editItemDetails">Item & Batch Info</Label>
              <div className="p-2.5 bg-slate-50 border rounded-lg space-y-1">
                <p className="font-semibold text-primary">{batchToEditExpiry?.itemId?.name}</p>
                <p className="text-muted font-mono text-[11px]">
                  Batch: {batchToEditExpiry?.batchNo} | Current Exp: {formatDate(batchToEditExpiry?.expiryDate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editMfgDate">Mfg Date (Optional)</Label>
                <Input
                  id="editMfgDate"
                  type="date"
                  value={editMfgDate}
                  onChange={(e) => setEditMfgDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="editExpiryDate">
                  Expiry Date <span className="text-error">*</span>
                </Label>
                <Input
                  id="editExpiryDate"
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-muted">
              Saving will automatically move this batch to the correct tab (Expiring Soon / Expired / back to normal active stock) based on the corrected date.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditExpiryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={isSavingExpiry}>
                {isSavingExpiry ? 'Saving...' : 'Save Expiry Date'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Supplier Return Modal */}
        <Dialog
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title={`Return Batch ${batchToReturn?.batchNo} to Supplier`}
          description="Record supplier return to remove expired stock and issue a return slip."
          className="max-w-md"
        >
          <form onSubmit={handleConfirmSupplierReturn} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="itemDetails">Item & Batch Info</Label>
              <div className="p-2.5 bg-slate-50 border rounded-lg space-y-1">
                <p className="font-semibold text-primary">{batchToReturn?.itemId?.name}</p>
                <p className="text-muted font-mono text-[11px]">Batch: {batchToReturn?.batchNo} | Exp: {formatDate(batchToReturn?.expiryDate)}</p>
                <p className="text-muted font-mono text-[11px]">Available Stock Qty: <span className="font-bold text-primary">{batchToReturn?.qty}</span></p>
              </div>
            </div>

            <div>
              <Label htmlFor="supplierName">Supplier Name</Label>
              <SupplierAutocomplete
                id="supplierName"
                placeholder="e.g. Cipla Pharma Distributors"
                value={supplierName}
                onChange={(val) => setSupplierName(val)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="returnQty">Return Quantity</Label>
                <Input
                  id="returnQty"
                  type="number"
                  min="1"
                  max={batchToReturn?.qty || 1}
                  value={returnQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = typeof val === 'string' && val.length > 1 && /^0\d/.test(val)
                      ? val.replace(/^0+/, '')
                      : val;
                    setReturnQty(cleanVal);
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="returnReason">Reason</Label>
                <Select
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                >
                  <option value="expired">Expired Stock</option>
                  <option value="damaged">Damaged Goods</option>
                  <option value="other">Other Reason</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="creditNoteNo">Credit Note No (Optional)</Label>
                <Input
                  id="creditNoteNo"
                  placeholder="e.g. CN-90812"
                  value={creditNoteNo}
                  onChange={(e) => setCreditNoteNo(e.target.value)}
                />
              </div>

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
            </div>

            <div>
              <Label htmlFor="notes">Notes / Remarks (Optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Handed over to sales representative"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" disabled={isSubmittingReturn}>
                {isSubmittingReturn ? 'Processing...' : 'Confirm Supplier Return'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Printable Return Slip Modal */}
        {createdReturnRecord && (
          <PrintableReturn
            isOpen={isPrintModalOpen}
            onClose={() => {
              setIsPrintModalOpen(false);
              setCreatedReturnRecord(null);
            }}
            returnRecord={createdReturnRecord}
          />
        )}

        {/* Printable Expiry Report Modal */}
        <PrintableExpiryReport
          isOpen={isReportPrintModalOpen}
          onClose={() => setIsReportPrintModalOpen(false)}
          batches={displayedBatches}
          reportTitle={
            activeTab === 'monthly'
              ? `Monthly Medicine Expiry Report — ${formatMonthLabel(selectedMonth)}`
              : activeTab === 'expired'
              ? 'Expired Medicines Stock Audit Report'
              : 'Expiring Soon Medicines Report (30 Days)'
          }
          periodLabel={activeTab === 'monthly' ? formatMonthLabel(selectedMonth) : ''}
          storeType={storeType}
        />
      </div>
    </div>
  );
}

export default ExpiryAlerts;
