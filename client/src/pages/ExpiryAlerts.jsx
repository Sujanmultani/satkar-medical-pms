import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Filter
} from 'lucide-react';
import { getExpiringSoon, getExpired, deleteBatch } from '@/services/batchService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

export function ExpiryAlerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'expired' ? 'expired' : 'expiring';

  const [activeTab, setActiveTab] = useState(initialTab); // 'expiring' | 'expired'
  const [storeType, setStoreType] = useState('all'); // 'all' | 'medical' | 'provision'

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = storeType !== 'all' ? { storeType } : {};
      const res = activeTab === 'expiring' 
        ? await getExpiringSoon(params)
        : await getExpired(params);
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to load expiry alerts:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch batch data from server.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, storeType]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab: tab === 'expired' ? 'expired' : 'expiring' });
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
      console.error('Failed to delete expired batch:', err);
      alert(err.response?.data?.error?.message || 'Failed to delete batch.');
    } finally {
      setIsDeleting(false);
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
      {/* 4% Opacity Logo Watermark backdrop */}
      <LogoWatermark opacity={0.04} scale={1.5} position="bottom-right" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <span>Expiry Alerts & Management</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Track stock expiring in the next 30 days and manage expired inventory disposal.
            </p>
          </div>

          {/* Store Filter Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-4 h-4 text-muted shrink-0" />
            <Select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              className="w-44 text-xs bg-white font-medium"
            >
              <option value="all">All Store Items</option>
              <option value="medical">Medical Store</option>
              <option value="provision">Provision Store</option>
            </Select>

            <button
              onClick={fetchAlerts}
              className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-primary transition-colors"
              title="Refresh Alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => handleTabChange('expiring')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'expiring'
                ? 'border-amber-500 text-amber-800 bg-amber-50/40 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-primary'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Expiring Soon (Next 30 Days)</span>
          </button>

          <button
            onClick={() => handleTabChange('expired')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'expired'
                ? 'border-red-500 text-red-800 bg-red-50/40 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-primary'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Already Expired</span>
          </button>
        </div>

        {/* 4-STATE PATTERN */}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Checking expiry statuses...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {!loading && error && (
          <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-error">Failed to Load Expiry Alerts</h3>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAlerts} className="mt-2 gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && batches.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            {activeTab === 'expiring' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-800">All Stock is Fresh!</h3>
                  <p className="text-xs text-muted mt-1 max-w-sm">
                    No items or batches are set to expire in the next 30 days.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-800">No Expired Batches</h3>
                  <p className="text-xs text-muted mt-1 max-w-sm">
                    There are zero expired batches in your inventory.
                  </p>
                </div>
              </>
            )}
          </Card>
        )}

        {/* STATE 4: POPULATED DATA TABLE */}
        {!loading && !error && batches.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead className="font-mono">Expiry Date</TableHead>
                <TableHead className="text-center font-mono">Stock Qty</TableHead>
                <TableHead className="text-right font-mono">MRP (₹)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {activeTab === 'expired' && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const item = batch.itemId || {};
                const isExpired = activeTab === 'expired';

                return (
                  <TableRow
                    key={batch._id}
                    className={
                      isExpired
                        ? 'bg-red-50/30 border-l-4 border-l-red-500'
                        : 'bg-amber-50/30 border-l-4 border-l-amber-400'
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
                      {isExpired ? (
                        <Badge variant="expired">Expired</Badge>
                      ) : (
                        <Badge variant="expiring_soon">Expiring Soon</Badge>
                      )}
                    </TableCell>

                    {isExpired && (
                      <TableCell className="text-right">
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
                      </TableCell>
                    )}
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
      </div>
    </div>
  );
}

export default ExpiryAlerts;
