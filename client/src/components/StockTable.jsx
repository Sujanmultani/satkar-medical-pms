import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Package, 
  AlertCircle, 
  RefreshCw,
  Calendar,
  Tag,
  FlaskConical
} from 'lucide-react';
import { getItems, createItem, updateItem, deleteItem } from '@/services/itemService';
import { createBatch, updateBatch, deleteBatch } from '@/services/batchService';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ItemFormModal } from './ItemFormModal';
import { BatchFormModal } from './BatchFormModal';
import { AddProductModal } from './AddProductModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { AlternativesModal } from './AlternativesModal';

export function StockTable({ storeType = 'medical' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Modals state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedItemForBatch, setSelectedItemForBatch] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'item' | 'batch', data: item | batch }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false);
  const [alternativesItem, setAlternativesItem] = useState(null);

  // Fetch Items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getItems({ storeType, search });
      setItems(res.data || []);
    } catch (err) {
      console.error('Error loading stock items:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch items from server.');
    } finally {
      setLoading(false);
    }
  }, [storeType, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Expand / Collapse Item Row
  const toggleExpand = (id) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  // Item Handlers
  const handleCreateItemSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateItem(editingItem._id, formData);
      } else {
        await createItem(formData);
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      console.error('Save item error:', err);
      alert(err.response?.data?.error?.message || 'Failed to save item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Handlers
  const handleCreateBatchSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingBatch) {
        await updateBatch(editingBatch._id, formData);
      } else {
        await createBatch(formData);
      }
      setIsBatchModalOpen(false);
      setEditingBatch(null);
      setSelectedItemForBatch(null);
      fetchItems();
    } catch (err) {
      console.error('Save batch error:', err);
      alert(err.response?.data?.error?.message || 'Failed to save batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'item') {
        await deleteItem(deleteTarget.data._id);
      } else if (deleteTarget.type === 'batch') {
        await deleteBatch(deleteTarget.data._id);
      }
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Summary Stats
  const totalItems = items.length;
  const totalBatches = items.reduce((acc, item) => acc + (item.batches?.length || 0), 0);
  const totalStockQty = items.reduce(
    (acc, item) => acc + (item.batches?.reduce((bAcc, b) => bAcc + (b.qty || 0), 0) || 0),
    0
  );

  // Helper calculations per item
  const getItemSummary = (item) => {
    const batches = item.batches || [];
    const totalQty = batches.reduce((acc, b) => acc + (b.qty || 0), 0);
    
    // Find nearest expiry batch
    let nearestBatch = null;
    let worstStatus = 'active';

    if (batches.length > 0) {
      const sortedByExpiry = [...batches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      nearestBatch = sortedByExpiry[0];

      if (batches.some((b) => b.status === 'expired')) {
        worstStatus = 'expired';
      } else if (batches.some((b) => b.status === 'expiring_soon')) {
        worstStatus = 'expiring_soon';
      }
    }

    return { totalQty, nearestBatch, worstStatus };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
            {storeType === 'medical' ? (
              <>
                <Package className="w-6 h-6 text-secondary" />
                <span>Medical Stock Management</span>
              </>
            ) : (
              <>
                <Layers className="w-6 h-6 text-accent" />
                <span>Provision Store Stock</span>
              </>
            )}
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage inventory items, batch details, rates, and stock quantities for {storeType === 'medical' ? 'Pharmacy' : 'Provision Store'}.
          </p>
        </div>

        {/* MAGIC UI ACCENT BUTTON: Glowing Shimmer "+ Add Item" Button */}
        <button
          onClick={() => setIsAddProductModalOpen(true)}
          className="relative inline-flex overflow-hidden rounded-xl p-[1.5px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 shrink-0 group transition-transform active:scale-95"
        >
          <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#0B4C52_0%,#17878E_33%,#5CA627_66%,#0B4C52_100%)]" />
          <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-3xl gap-2 group-hover:bg-primary-hover transition-colors shadow-lg">
            <Plus className="w-4 h-4 text-accent group-hover:rotate-90 transition-transform duration-300" />
            <span>Add Item</span>
          </span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-primary">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-heading font-bold text-primary mt-0.5">{totalItems}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-secondary">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider">Active Batches</p>
            <p className="text-2xl font-heading font-bold text-secondary-dark mt-0.5">{totalBatches}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-l-4 border-l-accent">
          <div>
            <p className="text-xs font-mono text-muted uppercase tracking-wider">Total Stock Qty</p>
            <p className="text-2xl font-heading font-bold text-text mt-0.5">{totalStockQty}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Controls Bar: Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={storeType === 'medical' ? 'Search by name, composition...' : 'Search items...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted font-mono">
          <span>Showing {items.length} records</span>
          <button
            onClick={fetchItems}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4-STATE PATTERN HANDLING */}

      {/* STATE 1: LOADING */}
      {loading && (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm font-medium text-primary">Loading inventory stock...</p>
        </Card>
      )}

      {/* STATE 2: ERROR */}
      {!loading && error && (
        <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-error">Failed to Load Stock Data</h3>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchItems} className="mt-2 gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
        </Card>
      )}

      {/* STATE 3: EMPTY */}
      {!loading && !error && items.length === 0 && (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">No Items Found</h3>
            <p className="text-xs text-muted mt-1 max-w-sm">
              {search
                ? `No items match "${search}". Try searching for a different keyword or clear the search.`
                : `Your ${storeType === 'medical' ? 'Medical Store' : 'Provision Store'} inventory is empty. Click below to add your first item.`}
            </p>
          </div>
          {!search && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddProductModalOpen(true)}
              className="mt-2 gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Item</span>
            </Button>
          )}
        </Card>
      )}

      {/* STATE 4: POPULATED DATA TABLE */}
      {!loading && !error && items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Item Name</TableHead>
              {storeType === 'medical' && <TableHead>Composition / Salt</TableHead>}
              <TableHead>Category / Unit</TableHead>
              <TableHead className="text-center font-mono">Total Qty</TableHead>
              <TableHead className="font-mono">Nearest Expiry</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const { totalQty, nearestBatch, worstStatus } = getItemSummary(item);
              const isExpanded = expandedItemId === item._id;
              const batches = item.batches || [];

              return (
                <React.Fragment key={item._id}>
                  {/* Parent Item Row */}
                  <TableRow className={isExpanded ? 'bg-teal-50/60 font-medium' : ''}>
                    <TableCell className="text-center p-2">
                      <button
                        onClick={() => toggleExpand(item._id)}
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                        title={isExpanded ? 'Collapse Batches' : 'Expand Batches'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-secondary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="font-semibold text-primary">
                      <div>
                        <span>{item.name}</span>
                        {item.hsnCode && (
                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            HSN: {item.hsnCode}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {storeType === 'medical' && (
                      <TableCell className="text-xs text-muted">
                        {item.composition || <span className="italic text-gray-400">N/A</span>}
                      </TableCell>
                    )}

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {item.category || 'General'}
                        </span>
                        <span className="text-muted font-mono text-[11px]">({item.unit || 'unit'})</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-sm">
                      <span className={totalQty === 0 ? 'text-error' : 'text-text'}>{totalQty}</span>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-gray-600">
                      {nearestBatch ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-secondary" />
                          <span>{formatDate(nearestBatch.expiryDate)}</span>
                        </div>
                      ) : (
                        <span className="italic text-gray-400">No batches</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {batches.length === 0 ? (
                        <Badge variant="outline">No Batches</Badge>
                      ) : worstStatus === 'expired' ? (
                        <Badge variant="expired">Expired</Badge>
                      ) : worstStatus === 'expiring_soon' ? (
                        <Badge variant="expiring_soon">Expiring Soon</Badge>
                      ) : (
                        <Badge variant="active">Active</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItemForBatch(item);
                            setEditingBatch(null);
                            setIsBatchModalOpen(true);
                          }}
                          className="h-8 px-2 text-xs gap-1 text-secondary hover:text-secondary-dark"
                          title="Add New Batch"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Batch</span>
                        </Button>

                        <button
                          onClick={() => {
                            setAlternativesItem(item);
                            setIsAlternativesOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-secondary hover:text-secondary-dark hover:bg-teal-50 transition-colors"
                          title="View Salt Alternatives"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsItemModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors"
                          title="Edit Item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setDeleteTarget({ type: 'item', data: item });
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Nested Batches Sub-table */}
                  {isExpanded && (
                    <TableRow className="bg-teal-50/20">
                      <TableCell colSpan={storeType === 'medical' ? 9 : 8} className="p-4 pl-12">
                        <div className="rounded-xl border border-teal-200/80 bg-white p-3 shadow-inner">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-secondary" />
                              <span>Batches for "{item.name}" ({batches.length})</span>
                            </h4>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedItemForBatch(item);
                                setEditingBatch(null);
                                setIsBatchModalOpen(true);
                              }}
                              className="h-7 text-xs gap-1 py-0 px-2.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Batch</span>
                            </Button>
                          </div>

                          {batches.length === 0 ? (
                            <p className="text-xs text-muted py-3 text-center italic">
                              No batches recorded for this item. Click "Add Batch" to record stock.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 font-mono text-[10px] uppercase">
                                  <tr>
                                    <th className="py-2 px-3">Batch No</th>
                                    <th className="py-2 px-3">Supplier</th>
                                    <th className="py-2 px-3">Mfg Date</th>
                                    <th className="py-2 px-3">Expiry Date</th>
                                    <th className="py-2 px-3 text-center">Stock Qty</th>
                                    <th className="py-2 px-3 text-right">Purchase (₹)</th>
                                    <th className="py-2 px-3 text-right">MRP (₹)</th>
                                    <th className="py-2 px-3 text-center">GST %</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                    <th className="py-2 px-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-mono">
                                  {batches.map((batch) => (
                                    <tr key={batch._id} className="hover:bg-gray-50/80">
                                      <td className="py-2 px-3 font-semibold text-primary">{batch.batchNo}</td>
                                      <td className="py-2 px-3 text-gray-700 font-sans font-medium">
                                        {batch.supplierId?.name ? (
                                          <div className="flex items-center gap-1.5">
                                            <span>{batch.supplierId.name}</span>
                                            {batch.paymentStatus === 'paid' ? (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">Paid</span>
                                            ) : (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">Pending</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span>—</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-gray-500">{formatDate(batch.mfgDate)}</td>
                                      <td className="py-2 px-3 font-medium text-gray-800">{formatDate(batch.expiryDate)}</td>
                                      <td className="py-2 px-3 text-center font-bold">{batch.qty}</td>
                                      <td className="py-2 px-3 text-right text-gray-600">₹{(batch.purchaseRate || 0).toFixed(2)}</td>
                                      <td className="py-2 px-3 text-right font-medium text-gray-900">₹{(batch.mrp || 0).toFixed(2)}</td>
                                      <td className="py-2 px-3 text-center text-gray-500">{batch.gstPercent}%</td>
                                      <td className="py-2 px-3 text-center font-sans">
                                        {batch.status === 'expired' ? (
                                          <Badge variant="expired" className="text-[10px] px-2 py-0">Expired</Badge>
                                        ) : batch.status === 'expiring_soon' ? (
                                          <Badge variant="expiring_soon" className="text-[10px] px-2 py-0">Expiring Soon</Badge>
                                        ) : (
                                          <Badge variant="active" className="text-[10px] px-2 py-0">Active</Badge>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right font-sans">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => {
                                              setSelectedItemForBatch(item);
                                              setEditingBatch(batch);
                                              setIsBatchModalOpen(true);
                                            }}
                                            className="p-1 rounded text-gray-500 hover:text-primary hover:bg-gray-200/50"
                                            title="Edit Batch"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setDeleteTarget({ type: 'batch', data: batch });
                                              setIsDeleteModalOpen(true);
                                            }}
                                            className="p-1 rounded text-gray-400 hover:text-error hover:bg-red-50"
                                            title="Delete Batch"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Unified Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={fetchItems}
        storeType={storeType}
      />

      {/* Item Modal (Edit Item) */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleCreateItemSubmit}
        initialData={editingItem}
        storeType={storeType}
        isLoading={isSubmitting}
      />

      {/* Batch Modal (Add/Edit) */}
      <BatchFormModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setEditingBatch(null);
          setSelectedItemForBatch(null);
        }}
        onSubmit={handleCreateBatchSubmit}
        item={selectedItemForBatch}
        initialData={editingBatch}
        isLoading={isSubmitting}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
        title={deleteTarget?.type === 'item' ? `Delete Item "${deleteTarget?.data?.name}"?` : `Delete Batch "${deleteTarget?.data?.batchNo}"?`}
        message={
          deleteTarget?.type === 'item'
            ? `Are you sure you want to delete "${deleteTarget?.data?.name}"? This will permanently delete the item and all its associated batch records.`
            : `Are you sure you want to delete batch "${deleteTarget?.data?.batchNo}"?`
        }
      />

      {/* Alternatives Modal */}
      <AlternativesModal
        isOpen={isAlternativesOpen}
        onClose={() => {
          setIsAlternativesOpen(false);
          setAlternativesItem(null);
        }}
        item={alternativesItem}
      />
    </div>
  );
}
