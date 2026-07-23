import React, { useState, useEffect, useCallback } from 'react';
import { Search, FlaskConical, Filter, RefreshCw, Package, Layers } from 'lucide-react';
import { searchByComposition } from '@/services/itemService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { AlternativesModal } from '@/components/AlternativesModal';

export function CompositionSearch() {
  const [searchTerm, setSearchTerm] = useState('Paracetamol');
  const [storeType, setStoreType] = useState('medical');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedItemForAlt, setSelectedItemForAlt] = useState(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchByComposition(searchTerm.trim(), storeType === 'all' ? '' : storeType);
      setItems(res.data || []);
    } catch (err) {
      console.error('Composition search error:', err);
      setError(err.response?.data?.error?.message || 'Failed to execute composition search.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, storeType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  // Group items by composition
  const groupedByComposition = items.reduce((acc, item) => {
    const key = (item.composition || 'Unspecified Salt').trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
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
              <FlaskConical className="w-6 h-6 text-secondary" />
              <span>Composition & Salt Search</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Search by active salt formula to discover all matching brand medicines and available stock alternatives.
            </p>
          </div>
        </div>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Enter salt composition (e.g. Paracetamol, Amoxicillin)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm font-medium bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted shrink-0" />
              <Select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                className="w-40 text-xs bg-white font-medium"
              >
                <option value="medical">Pharmacy Stock</option>
                <option value="provision">Provision Store</option>
                <option value="all">All Stores</option>
              </Select>
            </div>

            <button
              onClick={handleSearch}
              className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
              title="Refresh Search"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4-STATE PATTERN */}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
            <p className="text-sm font-medium text-primary">Searching active salt compositions...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {!loading && error && (
          <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-error">Search Failed</h3>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch} className="mt-2">
              Try Again
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && items.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-700">No Medicines Found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {searchTerm
                  ? `No medicines in stock contain the composition "${searchTerm}".`
                  : 'Type a salt or formula name above to search for brand alternatives.'}
              </p>
            </div>
          </Card>
        )}

        {/* STATE 4: POPULATED DATA GROUPED BY COMPOSITION */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedByComposition).map(([compName, groupItems]) => (
              <Card key={compName} className="p-5 bg-white/90 border-l-4 border-l-secondary">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-secondary" />
                    <h3 className="text-base font-heading font-bold text-primary">{compName}</h3>
                  </div>
                  <Badge variant="secondary">
                    {groupItems.length} {groupItems.length === 1 ? 'Brand' : 'Brands'} Available
                  </Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand / Medicine Name</TableHead>
                      <TableHead>Category / Unit</TableHead>
                      <TableHead className="text-center font-mono">Total Stock Qty</TableHead>
                      <TableHead className="font-mono">Nearest Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupItems.map((item) => {
                      const totalQty = (item.batches || []).reduce((acc, b) => acc + (b.qty || 0), 0);
                      const sortedBatches = [...(item.batches || [])].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
                      const nearestBatch = sortedBatches[0];

                      return (
                        <TableRow key={item._id} className="hover:bg-teal-50/30">
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

                          <TableCell className="text-xs">
                            <span className="px-2 py-0.5 rounded bg-gray-100 font-medium text-[11px] text-gray-700">
                              {item.category || 'General'}
                            </span>
                            <span className="text-muted ml-1 font-mono text-[11px]">({item.unit || 'unit'})</span>
                          </TableCell>

                          <TableCell className="text-center font-mono font-bold text-sm">
                            <span className={totalQty === 0 ? 'text-error' : 'text-text'}>{totalQty}</span>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-gray-600">
                            {nearestBatch ? formatDate(nearestBatch.expiryDate) : <span className="italic text-gray-400">No batches</span>}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedItemForAlt(item)}
                              className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>View Alternatives</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        )}

        {/* Alternatives Modal */}
        <AlternativesModal
          isOpen={Boolean(selectedItemForAlt)}
          onClose={() => setSelectedItemForAlt(null)}
          item={selectedItemForAlt}
        />
      </div>
    </div>
  );
}

export default CompositionSearch;
