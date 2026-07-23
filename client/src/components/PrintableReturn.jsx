import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { getSettings } from '@/services/settingsService';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer } from 'lucide-react';

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

  const isSupplier = returnRecord.type === 'supplier';
  const item = returnRecord.itemId || {};
  const batch = returnRecord.batchId || {};
  const refBill = returnRecord.referenceBillId || {};

  const reasonLabels = {
    expired: 'Expired Stock',
    damaged: 'Damaged Goods',
    wrong_item: 'Wrong Item Dispensed',
    customer_dissatisfaction: 'Customer Return / Exchange',
    other: 'Other Reason',
  };

  const unitRate = isSupplier ? (batch.purchaseRate || 0) : (batch.mrp || 0);
  const calculatedTotal = (returnRecord.quantity || 0) * unitRate;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${isSupplier ? 'Supplier Return Slip' : 'Customer Return Voucher'} — ${returnRecord.returnNo}`}
      description="Printable Return Voucher & Audit Document"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Printable Paper Document */}
        <div id="printable-return-area" className="p-6 bg-white rounded-xl border border-gray-200 text-xs text-text shadow-sm space-y-6">
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
              <p className="text-xs font-mono font-bold text-primary mt-2">{returnRecord.returnNo}</p>
              <p className="text-[11px] text-muted font-mono">Date: {formatDate(returnRecord.returnDate)}</p>
            </div>
          </div>

          {/* Details Metadata */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px]">
            <div>
              {isSupplier ? (
                <>
                  <p><span className="font-semibold text-gray-600">Supplier:</span> {returnRecord.supplierName || 'N/A'}</p>
                  <p><span className="font-semibold text-gray-600">Credit Note No:</span> {returnRecord.creditNoteNo || 'Pending'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold text-gray-600">Customer Name:</span> {returnRecord.customerName || 'Walk-in Customer'}</p>
                  {returnRecord.customerPhone && <p><span className="font-semibold text-gray-600">Phone:</span> {returnRecord.customerPhone}</p>}
                  {refBill.billNo && <p><span className="font-semibold text-gray-600">Reference Bill:</span> {refBill.billNo}</p>}
                </>
              )}
            </div>
            <div className="text-right space-y-1">
              <p><span className="font-semibold text-gray-600">Reason:</span> <span className="font-medium text-primary">{reasonLabels[returnRecord.reason] || returnRecord.reason}</span></p>
              <p><span className="font-semibold text-gray-600">Stock Restocked:</span> {returnRecord.restocked ? 'Yes (Returned to Inventory)' : 'No (Scrapped/Disposed)'}</p>
              {!isSupplier && (
                <p><span className="font-semibold text-gray-600">Refund Amount:</span> <span className="font-bold text-emerald-700">₹{(returnRecord.refundAmount || 0).toFixed(2)}</span></p>
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
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                <tr>
                  <td className="p-2.5 font-sans font-medium text-gray-900">
                    {item.name || 'Unknown Item'}
                    {item.composition && <p className="text-[10px] text-muted font-normal">{item.composition}</p>}
                  </td>
                  <td className="p-2.5 font-bold">{batch.batchNo || 'N/A'}</td>
                  <td className="p-2.5 text-center">{formatDate(batch.expiryDate)}</td>
                  <td className="p-2.5 text-right font-bold">{returnRecord.quantity}</td>
                  <td className="p-2.5 text-right">₹{unitRate.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-bold">₹{calculatedTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {returnRecord.notes && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
              <span className="font-semibold text-gray-700">Notes / Remarks: </span>
              <span className="text-gray-600">{returnRecord.notes}</span>
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
  );
}

export default PrintableReturn;
