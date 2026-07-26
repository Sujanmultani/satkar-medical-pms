import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { getSettings } from '@/services/settingsService';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer } from 'lucide-react';
import { roundMoney } from '@/utils/money';

export function PrintableReturn({ isOpen, onClose, returnRecord, businessInfo }) {
  const [settings, setSettings] = useState(businessInfo || null);

  useEffect(() => {
    if (isOpen && !businessInfo) {
      getSettings()
        .then((res) => setSettings(res.data))
        .catch((err) => console.error('Failed to load business settings for return slip:', err));
    }
  }, [isOpen, businessInfo]);

  if (!isOpen || !returnRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeBusinessName = settings?.businessName || 'Satkar Medical';
  const activeGstin = settings?.gstin ? settings.gstin : '[Not Configured]';
  const activeAddress = settings?.address || 'Main Road, Jambusar';
  const activePhone = settings?.phone || '';

  const recordsArray = Array.isArray(returnRecord)
    ? returnRecord
    : (returnRecord?.records ? returnRecord.records : [returnRecord]);

  const primaryRecord = recordsArray[0] || {};
  const isSupplier = primaryRecord.type === 'supplier';
  const refBill = primaryRecord.referenceBillId || {};

  const reasonLabels = {
    expired: 'Expired Stock',
    damaged: 'Damaged Goods',
    wrong_item: 'Wrong Item Dispensed',
    customer_dissatisfaction: 'Customer Return / Exchange',
    other: 'Other Reason',
  };

  const totalRefundAmount = recordsArray.reduce((sum, r) => {
    const b = r.batchId || {};
    const rate = isSupplier ? (b.purchaseRate || 0) : (b.mrp || 0);
    const lineVal = r.refundAmount !== undefined && r.refundAmount !== null && r.refundAmount > 0
      ? r.refundAmount
      : roundMoney((r.quantity || 0) * rate);
    return sum + lineVal;
  }, 0);

  const displayReturnNo = recordsArray.length > 1
    ? `${primaryRecord.returnNo} (+${recordsArray.length - 1} items)`
    : primaryRecord.returnNo;

  const renderPaperContent = () => (
    <div className="space-y-6">
      {/* Voucher Header */}
      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={logoAsset} alt="Satkar Logo" className="w-12 h-12 object-contain rounded border p-1" />
          <div>
            <h2 className="text-lg font-bold font-heading text-primary leading-tight">{activeBusinessName}</h2>
            <p className="text-[11px] text-muted">{activeAddress}</p>
            {activePhone && <p className="text-[10px] text-muted">Phone: {activePhone}</p>}
            <p className="text-[10px] text-muted font-mono mt-0.5">GSTIN: <span className="font-semibold">{activeGstin}</span></p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
            isSupplier ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
          }`}>
            {isSupplier ? 'SUPPLIER RETURN SLIP' : 'CUSTOMER RETURN VOUCHER'}
          </span>
          <p className="text-xs font-mono font-bold text-primary mt-2">{displayReturnNo}</p>
          <p className="text-[11px] text-muted font-mono">Date: {formatDate(primaryRecord.returnDate)}</p>
        </div>
      </div>

      {/* Details Metadata */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px]">
        <div>
          {isSupplier ? (
            <>
              <p><span className="font-semibold text-gray-600">Supplier:</span> {primaryRecord.supplierName || 'N/A'}</p>
              <p><span className="font-semibold text-gray-600">Credit Note No:</span> {primaryRecord.creditNoteNo || 'No credit note recorded'}</p>
            </>
          ) : (
            <>
              <p><span className="font-semibold text-gray-600">Customer Name:</span> {primaryRecord.customerName || 'Walk-in Customer'}</p>
              {primaryRecord.customerPhone && <p><span className="font-semibold text-gray-600">Phone:</span> {primaryRecord.customerPhone}</p>}
              {refBill.billNo && <p><span className="font-semibold text-gray-600">Reference Bill:</span> {refBill.billNo}</p>}
            </>
          )}
        </div>
        <div className="text-right space-y-1">
          <p><span className="font-semibold text-gray-600">Reason:</span> <span className="font-medium text-primary">{reasonLabels[primaryRecord.reason] || primaryRecord.reason}</span></p>
          <p><span className="font-semibold text-gray-600">Stock Restocked:</span> {primaryRecord.restocked ? 'Yes (Returned to Inventory)' : 'No (Scrapped/Disposed)'}</p>
          {!isSupplier && (
            <p><span className="font-semibold text-gray-600">Total Refund:</span> <span className="font-bold text-emerald-700 text-sm">₹{totalRefundAmount.toFixed(2)}</span></p>
          )}
        </div>
      </div>

      {/* Item Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-2.5">Item Name</th>
              <th className="p-2.5">Batch No</th>
              <th className="p-2.5 text-center">Expiry</th>
              <th className="p-2.5 text-right">Qty</th>
              <th className="p-2.5 text-right">{isSupplier ? 'Purchase Rate' : 'MRP'}</th>
              <th className="p-2.5 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono">
            {recordsArray.map((rec, idx) => {
              const item = rec.itemId || {};
              const batch = rec.batchId || {};
              const unitRate = isSupplier ? (batch.purchaseRate || 0) : (batch.mrp || 0);
              const lineTotal = rec.refundAmount !== undefined && rec.refundAmount !== null && rec.refundAmount > 0
                ? rec.refundAmount
                : roundMoney((rec.quantity || 0) * unitRate);

              return (
                <tr key={idx}>
                  <td className="p-2.5 font-sans font-medium text-gray-900">
                    {item.name || 'Unknown Item'}
                    {item.composition && <p className="text-[10px] text-muted font-normal">{item.composition}</p>}
                  </td>
                  <td className="p-2.5 font-bold">{batch.batchNo || 'N/A'}</td>
                  <td className="p-2.5 text-center">{formatDate(batch.expiryDate)}</td>
                  <td className="p-2.5 text-right font-bold">{rec.quantity}</td>
                  <td className="p-2.5 text-right">₹{unitRate.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold">₹{lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          {!isSupplier && recordsArray.length > 1 && (
            <tfoot className="border-t-2 border-gray-300 font-mono bg-gray-50/80 font-bold">
              <tr>
                <td colSpan="5" className="p-2.5 text-right font-sans text-xs uppercase text-gray-700">
                  Total Refund Amount:
                </td>
                <td className="p-2.5 text-right text-emerald-800 text-sm font-bold">
                  ₹{totalRefundAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Notes */}
      {primaryRecord.notes && (
        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
          <span className="font-semibold text-gray-700">Notes / Remarks: </span>
          <span className="text-gray-600">{primaryRecord.notes}</span>
        </div>
      )}

      {/* Signatures */}
      <div className="pt-8 flex justify-between items-end text-[11px] text-gray-500">
        <div>
          <div className="w-36 border-b border-gray-400 mb-1" />
          <p>{isSupplier ? 'Received By (Supplier / Courier)' : 'Customer Signature'}</p>
        </div>
        <div className="text-right">
          <div className="w-36 border-b border-gray-400 mb-1 ml-auto" />
          <p>Authorized Signature ({activeBusinessName})</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* On-screen Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={`${isSupplier ? 'Supplier Return Slip' : 'Customer Return Voucher'} — ${returnRecord.returnNo}`}
        description="Printable Return Voucher & Audit Document"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-gray-200 text-xs text-text shadow-sm">
            {renderPaperContent()}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              <span>Print Return Voucher</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Body Portal for Print Layout */}
      {createPortal(
        <div id="printable-return-area" className="hidden print:block p-6 bg-white text-xs text-text">
          {renderPaperContent()}
        </div>,
        document.body
      )}
    </>
  );
}

export default PrintableReturn;
