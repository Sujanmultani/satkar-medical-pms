import React, { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getAlternatives } from '@/services/itemService';
import { FlaskConical, Layers, AlertCircle, RefreshCw } from 'lucide-react';

export function AlternativesModal({ isOpen, onClose, item }) {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item?._id) {
      setLoading(true);
      setError(null);
      getAlternatives(item._id)
        .then((res) => {
          setAlternatives(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch alternatives:', err);
          setError(err.response?.data?.error?.message || 'Failed to fetch alternative medicines.');
        })
        .finally(() => setLoading(false));
    } else {
      setAlternatives([]);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Brand Alternatives for "${item.name}"`}
      description={item.composition ? `Composition: ${item.composition}` : 'No composition specified'}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {loading && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border-3 border-secondary/20 border-t-secondary animate-spin" />
            <p className="text-xs text-muted">Searching matching salt alternatives...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-4 rounded-xl bg-red-50 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && alternatives.length === 0 && (
          <div className="p-8 text-center bg-gray-50 rounded-xl">
            <FlaskConical className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700">No Alternative Brands Found</p>
            <p className="text-xs text-muted mt-1">
              {item.composition
                ? `No other medicines in stock share the composition "${item.composition}".`
                : 'This medicine does not have a composition/salt on record.'}
            </p>
          </div>
        )}

        {!loading && !error && alternatives.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {alternatives.map((alt) => {
              const totalQty = (alt.batches || []).reduce((acc, b) => acc + (b.qty || 0), 0);
              const minMrp = (alt.batches || []).length > 0 
                ? Math.min(...alt.batches.map(b => b.mrp || 0)) 
                : 0;

              return (
                <div
                  key={alt._id}
                  className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/20 hover:bg-teal-50/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-primary">{alt.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                      <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[10px]">
                        {alt.category || 'General'}
                      </span>
                      <span>Unit: {alt.unit || 'unit'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono">
                      <span className="text-muted">Stock: </span>
                      <strong className={totalQty === 0 ? 'text-error' : 'text-primary'}>
                        {totalQty}
                      </strong>
                    </div>
                    {minMrp > 0 && (
                      <p className="text-xs font-mono text-gray-700 mt-0.5">
                        MRP: ₹{minMrp.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
