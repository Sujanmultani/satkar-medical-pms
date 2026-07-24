import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  Phone, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ArrowLeft, 
  Package, 
  Layers, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getSuppliers, getSupplierById } from '@/services/supplierService';
import { updatePaymentStatus } from '@/services/batchService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Detail View State
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [supplierDetail, setSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingBatchId, setUpdatingBatchId] = useState(null);

  // Fetch Suppliers List
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSuppliers({ search, page, limit: 20 });
      setSuppliers(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.response?.data?.error?.message || 'Failed to load supplier directory.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  // Fetch Single Supplier Detail
  const fetchSupplierDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const res = await getSupplierById(id);
      setSupplierDetail(res.data);
    } catch (err) {
      console.error('Error fetching supplier detail:', err);
      alert('Failed to load supplier details.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectSupplier = (id) => {
    setSelectedSupplierId(id);
    fetchSupplierDetail(id);
  };

  const handleBackToList = () => {
    setSelectedSupplierId(null);
    setSupplierDetail(null);
    fetchSuppliers();
  };

  // Toggle Payment Status (Paid / Pending)
  const handleTogglePaymentStatus = async (batchId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    setUpdatingBatchId(batchId);
    try {
      await updatePaymentStatus(batchId, newStatus);
      if (selectedSupplierId) {
        fetchSupplierDetail(selectedSupplierId);
      }
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to update payment status:', err);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setUpdatingBatchId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Aggregated directory metrics
  const totalDirectoryDue = suppliers.reduce((acc, s) => acc + (s.summary?.totalDue || 0), 0);
  const totalPendingBatches = suppliers.reduce((acc, s) => acc + (s.summary?.pendingCount || 0), 0);
  const totalPaidBatches = suppliers.reduce((acc, s) => acc + (s.summary?.paidCount || 0), 0);

  return (
    <div className="relative min-h-screen p-6 md:p-8 bg-background overflow-hidden">
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* VIEW 1: SUPPLIER DETAIL VIEW (When a supplier is selected)  */}
        {/* ========================================================= */}
        {selectedSupplierId ? (
          <div className="space-y-6">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToList}
                className="gap-2 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Supplier Directory</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchSupplierDetail(selectedSupplierId)}
                className="gap-1 text-xs text-muted"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detailLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {detailLoading || !supplierDetail ? (
              <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm font-medium text-primary">Loading supplier portfolio & medicines...</p>
              </Card>
            ) : (
              <>
                {/* Supplier Profile Info Header Card */}
                <Card className="p-6 bg-white/95 border-l-4 border-l-primary shadow-card">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-secondary uppercase tracking-wider mb-1">
                        <Building2 className="w-4 h-4 text-accent" />
                        <span>Supplier Details</span>
                      </div>
                      <h1 className="text-2xl font-heading font-bold text-primary">
                        {supplierDetail.supplier.name}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted">
                        {supplierDetail.supplier.phone && (
                          <span className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {supplierDetail.supplier.phone}
                          </span>
                        )}
                        {supplierDetail.supplier.address && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {supplierDetail.supplier.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats Banner */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <div className="px-3 border-r border-slate-200">
                        <p className="text-[10px] font-mono text-muted uppercase">Total Due</p>
                        <p className="text-lg font-bold font-mono text-amber-700">
                          ₹{(supplierDetail.summary?.totalDue || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="px-3 border-r border-slate-200">
                        <p className="text-[10px] font-mono text-muted uppercase">Pending</p>
                        <p className="text-lg font-bold font-mono text-amber-800">
                          {supplierDetail.summary?.pendingCount || 0}
                        </p>
                      </div>
                      <div className="px-3">
                        <p className="text-[10px] font-mono text-muted uppercase">Paid</p>
                        <p className="text-lg font-bold font-mono text-emerald-700">
                          {supplierDetail.summary?.paidCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Supplied Items & Batches Table */}
                <Card className="p-5 bg-white/95">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-heading font-bold text-primary flex items-center gap-2">
                        <Package className="w-4 h-4 text-secondary" />
                        <span>All Medicines & Stock Supplied</span>
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        Showing all {supplierDetail.batches.length} batch purchases linked to {supplierDetail.supplier.name}.
                      </p>
                    </div>
                  </div>

                  {supplierDetail.batches.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl">
                      <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-gray-500">No batch purchases recorded for this supplier yet.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine / Item Name</TableHead>
                          <TableHead>Composition / Salt</TableHead>
                          <TableHead>Batch No</TableHead>
                          <TableHead className="font-mono">Expiry Date</TableHead>
                          <TableHead className="text-center font-mono">Stock Qty</TableHead>
                          <TableHead className="text-right font-mono">Purchase Rate</TableHead>
                          <TableHead className="text-right font-mono">Amount Due (₹)</TableHead>
                          <TableHead className="text-center">Payment Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierDetail.batches.map((batch) => {
                          const item = batch.itemId || {};
                          const isPaid = batch.paymentStatus === 'paid';
                          const isUpdating = updatingBatchId === batch._id;

                          return (
                            <TableRow key={batch._id} className={isPaid ? 'bg-emerald-50/20' : 'bg-amber-50/20'}>
                              <TableCell className="font-semibold text-primary">
                                <div>
                                  <span>{item.name || 'Unknown Item'}</span>
                                  {item.storeType && (
                                    <Badge variant={item.storeType === 'medical' ? 'default' : 'secondary'} className="ml-2 text-[9px] px-1.5 py-0">
                                      {item.storeType === 'medical' ? 'Pharmacy' : 'Provision'}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-xs text-muted">
                                {item.composition || <span className="italic text-gray-400">N/A</span>}
                              </TableCell>

                              <TableCell className="font-mono font-bold text-gray-800">{batch.batchNo}</TableCell>

                              <TableCell className="font-mono text-xs">{formatDate(batch.expiryDate)}</TableCell>

                              <TableCell className="text-center font-mono font-bold">{batch.qty}</TableCell>

                              <TableCell className="text-right font-mono">₹{(batch.purchaseRate || 0).toFixed(2)}</TableCell>

                              <TableCell className="text-right font-mono font-bold text-gray-900">
                                ₹{(batch.amountDue || (batch.qty * batch.purchaseRate) || 0).toFixed(2)}
                              </TableCell>

                              <TableCell className="text-center">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Pending</span>
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  variant={isPaid ? 'outline' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleTogglePaymentStatus(batch._id, batch.paymentStatus)}
                                  disabled={isUpdating}
                                  className="h-7 text-xs px-2.5 py-0 font-medium"
                                >
                                  {isUpdating ? '...' : isPaid ? 'Mark Pending' : 'Mark Paid'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 2: DIRECTORY LIST VIEW (Default View)                */
          /* ========================================================= */
          <>
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-secondary" />
                  <span>Supplier Directory & Payment Ledger</span>
                </h1>
                <p className="text-xs text-muted mt-1">
                  Manage distributors, view supplier medicine portfolios, and track outstanding purchase payments.
                </p>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 flex items-center justify-between border-l-4 border-l-primary">
                <div>
                  <p className="text-xs font-mono text-muted uppercase tracking-wider">Total Suppliers</p>
                  <p className="text-2xl font-heading font-bold text-primary mt-0.5">{pagination.total}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500 bg-amber-50/20">
                <div>
                  <p className="text-xs font-mono text-amber-800 uppercase tracking-wider">Total Outstanding Due</p>
                  <p className="text-2xl font-heading font-bold text-amber-800 mt-0.5">
                    ₹{totalDirectoryDue.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500 bg-emerald-50/20">
                <div>
                  <p className="text-xs font-mono text-emerald-800 uppercase tracking-wider">Purchases Settlement</p>
                  <p className="text-sm font-bold font-mono text-emerald-800 mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-200 rounded">{totalPaidBatches} Paid</span>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded">{totalPendingBatches} Pending</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </Card>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search suppliers by name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 bg-white text-xs"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted font-mono">
                <span>Showing {suppliers.length} of {pagination.total} suppliers</span>
                <button
                  onClick={fetchSuppliers}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                  title="Refresh Directory"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 4-STATE PATTERN */}

            {/* STATE 1: LOADING */}
            {loading && (
              <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <p className="text-sm font-medium text-primary">Loading supplier directory...</p>
              </Card>
            )}

            {/* STATE 2: ERROR */}
            {!loading && error && (
              <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-error">Failed to Load Suppliers</h3>
                  <p className="text-xs text-gray-600 mt-1">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSuppliers} className="mt-2 gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </Button>
              </Card>
            )}

            {/* STATE 3: EMPTY */}
            {!loading && !error && suppliers.length === 0 && (
              <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary">No Suppliers Found</h3>
                  <p className="text-xs text-muted mt-1 max-w-sm">
                    {search
                      ? `No suppliers match "${search}". Try searching for a different name.`
                      : 'No suppliers recorded yet. Suppliers are added automatically when you scan an invoice or add stock with supplier details.'}
                  </p>
                </div>
              </Card>
            )}

            {/* STATE 4: POPULATED SUPPLIERS TABLE */}
            {!loading && !error && suppliers.length > 0 && (
              <Card className="p-0 overflow-hidden border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier / Distributor Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-center font-mono">Batches</TableHead>
                      <TableHead className="text-right font-mono">Total Outstanding Due (₹)</TableHead>
                      <TableHead className="text-center">Purchases Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((sup) => {
                      const summary = sup.summary || {};
                      const hasDue = summary.totalDue > 0;

                      return (
                        <TableRow
                          key={sup._id}
                          onClick={() => handleSelectSupplier(sup._id)}
                          className="cursor-pointer hover:bg-teal-50/40 transition-colors"
                        >
                          <TableCell className="font-semibold text-primary">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-secondary shrink-0" />
                              <span>{sup.name}</span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-gray-700">
                            {sup.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {sup.phone}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-gray-600">
                            {sup.address ? (
                              <span className="truncate max-w-[200px] inline-block">{sup.address}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold text-xs">
                            {summary.totalBatches || 0}
                          </TableCell>

                          <TableCell className="text-right font-mono font-bold text-sm">
                            <span className={hasDue ? 'text-amber-800' : 'text-emerald-700'}>
                              ₹{(summary.totalDue || 0).toFixed(2)}
                            </span>
                          </TableCell>

                          <TableCell className="text-center font-mono text-xs">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {summary.paidCount || 0} Paid
                              </span>
                              {summary.pendingCount > 0 && (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                  {summary.pendingCount} Pending
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSupplier(sup._id);
                              }}
                              className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                            >
                              <span>View Medicines</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Suppliers;
