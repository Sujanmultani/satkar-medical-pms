import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { getSettings } from '@/services/settingsService';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer, Calendar, Building2, AlertTriangle, Layers } from 'lucide-react';
import { roundMoney } from '@/utils/money';

export function PrintableExpiryReport({
  isOpen,
  onClose,
  batches = [],
  reportTitle = 'Monthly Medicine Expiry Report',
  periodLabel = '',
  storeType = 'all',
  businessInfo,
}) {
  const [settings, setSettings] = useState(businessInfo || null);

  useEffect(() => {
    if (isOpen && !businessInfo) {
      getSettings()
        .then((res) => setSettings(res.data))
        .catch((err) => console.error('Failed to load business settings for expiry report:', err));
    }
  }, [isOpen, businessInfo]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return isNaN(date.getTime())
      ? 'N/A'
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d = new Date()) => {
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const activeBusinessName = settings?.businessName || 'Satkar Medical';
  const activeGstin = settings?.gstin || '[Not Configured]';
  const activeAddress = settings?.address || 'Main Road, Jambusar';
  const activePhone = settings?.phone || '';
  const activeDl = settings?.dlNumber || '';

  const totalQty = batches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
  const totalMrpValue = batches.reduce(
    (sum, b) => sum + (Number(b.qty) || 0) * (Number(b.mrp) || 0),
    0
  );
  const totalPurchaseValue = batches.reduce(
    (sum, b) => sum + (Number(b.qty) || 0) * (Number(b.purchaseRate) || 0),
    0
  );

  const storeLabel =
    storeType === 'medical'
      ? 'Pharmacy Store Only'
      : storeType === 'provision'
      ? 'Provision Store Only'
      : 'All Stores (Medical & Provision)';

  const renderPaperContent = () => (
    <div className="space-y-5 text-gray-900 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b-2 border-gray-800">
        <div className="flex items-center gap-3">
          <img
            src={logoAsset}
            alt="Satkar Logo"
            className="w-14 h-14 object-contain rounded border border-gray-300 p-1"
          />
          <div>
            <h1 className="text-xl font-bold font-heading text-primary leading-tight uppercase tracking-tight">
              {activeBusinessName}
            </h1>
            <p className="text-xs text-gray-600 font-medium">{activeAddress}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-600 mt-0.5">
              {activePhone && <span>Phone: <strong className="text-gray-800">{activePhone}</strong></span>}
              {activeGstin && <span>GSTIN: <strong className="font-mono text-gray-800">{activeGstin}</strong></span>}
              {activeDl && <span>DL No: <strong className="font-mono text-gray-800">{activeDl}</strong></span>}
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider">
            Expiry Stock Audit Report
          </span>
          <p className="text-sm font-bold text-gray-900 mt-2 font-heading">{reportTitle}</p>
          {periodLabel && (
            <p className="text-xs font-semibold text-secondary-dark mt-0.5">
              Target Month: {periodLabel}
            </p>
          )}
          <p className="text-[10px] text-gray-500 font-mono mt-1">
            Generated: {formatDateTime()}
          </p>
        </div>
      </div>

      {/* Report Info & Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
        <div>
          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Store Scope</span>
          <span className="font-semibold text-gray-800">{storeLabel}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Total Items / Batches</span>
          <span className="font-bold text-primary text-sm font-mono">{batches.length}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Total Stock Quantity</span>
          <span className="font-bold text-gray-900 text-sm font-mono">{totalQty} units</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Total MRP Value</span>
          <span className="font-bold text-rose-700 text-sm font-mono">₹{roundMoney(totalMrpValue).toFixed(2)}</span>
          {totalPurchaseValue > 0 && (
            <span className="block text-[10px] text-gray-500 font-mono">
              Pur. Cost: ₹{roundMoney(totalPurchaseValue).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Main Medicine Expiry Table */}
      {batches.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg text-gray-500 text-xs">
          No expiring medicine batches found for this period.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-300 rounded">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                <th className="p-2 w-8 text-center border-r border-gray-300">#</th>
                <th className="p-2 border-r border-gray-300">Medicine / Item Name</th>
                <th className="p-2 border-r border-gray-300">Composition</th>
                <th className="p-2 border-r border-gray-300 font-mono text-center">Batch No</th>
                <th className="p-2 border-r border-gray-300 text-center font-mono">Expiry Date</th>
                <th className="p-2 border-r border-gray-300 text-center font-mono">Stock Qty</th>
                <th className="p-2 border-r border-gray-300 text-right font-mono">MRP (₹)</th>
                <th className="p-2 border-r border-gray-300 text-right font-mono">Total MRP (₹)</th>
                <th className="p-2 border-r border-gray-300">Supplier Name</th>
                <th className="p-2 text-center">Rack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {batches.map((batch, idx) => {
                const item = batch.itemId || {};
                const supplier = batch.supplierId || {};
                const lineTotalMrp = (Number(batch.qty) || 0) * (Number(batch.mrp) || 0);

                return (
                  <tr key={batch._id || idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}>
                    <td className="p-1.5 text-center font-sans text-gray-500 border-r border-gray-200">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 font-sans font-bold text-gray-900 border-r border-gray-200">
                      {item.name || 'Unnamed Item'}
                    </td>
                    <td className="p-1.5 font-sans text-gray-600 text-[10px] border-r border-gray-200">
                      {item.composition || '—'}
                    </td>
                    <td className="p-1.5 text-center font-bold text-primary border-r border-gray-200">
                      {batch.batchNo}
                    </td>
                    <td className="p-1.5 text-center font-semibold text-rose-700 border-r border-gray-200 whitespace-nowrap">
                      {formatDate(batch.expiryDate)}
                    </td>
                    <td className="p-1.5 text-center font-bold text-gray-900 border-r border-gray-200">
                      {batch.qty}
                    </td>
                    <td className="p-1.5 text-right border-r border-gray-200">
                      ₹{(Number(batch.mrp) || 0).toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right font-bold text-gray-900 border-r border-gray-200">
                      ₹{lineTotalMrp.toFixed(2)}
                    </td>
                    <td className="p-1.5 font-sans text-gray-800 text-[10px] border-r border-gray-200">
                      {supplier.name || '—'}
                    </td>
                    <td className="p-1.5 font-sans text-center text-gray-600 text-[10px]">
                      {item.location || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-800 bg-gray-100 font-mono font-bold text-gray-900">
              <tr>
                <td colSpan="5" className="p-2 text-right font-sans text-xs uppercase">
                  Grand Total:
                </td>
                <td className="p-2 text-center text-xs font-bold text-primary">
                  {totalQty}
                </td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 text-right text-xs font-bold text-rose-700">
                  ₹{roundMoney(totalMrpValue).toFixed(2)}
                </td>
                <td colSpan="2" className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Action / Return Instructions */}
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
        <strong>Notice for Pharmacy Staff:</strong> Please verify physical inventory on shelves against this sheet.
        Batches listed here should be pulled from active dispensing racks and quarantined for supplier return / credit note processing or safe disposal.
      </div>

      {/* Signature Section */}
      <div className="pt-8 flex justify-between items-end text-xs text-gray-700">
        <div>
          <div className="w-44 border-b border-gray-500 mb-1" />
          <p className="font-semibold">Prepared By (Pharmacist / Staff)</p>
          <p className="text-[10px] text-gray-500">Date & Signature</p>
        </div>
        <div className="text-right">
          <div className="w-44 border-b border-gray-500 mb-1 ml-auto" />
          <p className="font-semibold">Authorized Signatory</p>
          <p className="text-[10px] text-gray-500">For {activeBusinessName}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* On-Screen Modal Preview */}
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={reportTitle}
        description="Printable medicine expiry report formatted for standard A4 pharmacy documentation."
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            {renderPaperContent()}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-2 bg-primary hover:bg-primary-dark text-white font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print Expiry Report</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Body Portal for Clean A4 Browser Print */}
      {createPortal(
        <div id="printable-expiry-area" className="hidden print:block p-6 bg-white text-xs text-black">
          {renderPaperContent()}
        </div>,
        document.body
      )}
    </>
  );
}

export default PrintableExpiryReport;
