import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { markPrinted } from '@/services/billService';
import { getSettings } from '@/services/settingsService';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer, MessageCircle } from 'lucide-react';

export function PrintableBill({ isOpen, onClose, bill, businessInfo }) {
  const [settings, setSettings] = useState(businessInfo || null);

  useEffect(() => {
    if (isOpen && !businessInfo) {
      getSettings()
        .then((res) => setSettings(res.data))
        .catch((err) => console.error('Failed to load business settings for bill header:', err));
    }
  }, [isOpen, businessInfo]);

  if (!isOpen || !bill) return null;

  const handlePrint = async () => {
    window.print();
    try {
      if (bill._id) {
        await markPrinted(bill._id);
      }
    } catch (err) {
      console.error('Failed to mark bill as printed:', err);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const items = bill.items || [];
  const gstBreakdown = bill.gstBreakdown || {};

  const activeBusinessName = settings?.businessName || 'Satkar Medical';
  const activeGstin = settings?.gstin ? settings.gstin : '[Not Configured]';
  const activeAddress = settings?.address || 'Main Road, Jambusar';
  const activePhone = settings?.phone || '';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Tax Invoice — ${bill.billNo}`}
      description="Printable GST Tax Invoice & Checkout Receipt"
      className="max-w-3xl"
    >
      {/* Printable Container */}
      <div className="space-y-6">
        {/* Printable Paper Document */}
        <div id="printable-bill-area" className="p-6 bg-white rounded-xl border border-gray-200 text-xs text-text shadow-sm space-y-6">
          {/* Invoice Header */}
          <div className="flex items-start justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img src={logoAsset} alt="Satkar Logo" className="w-12 h-12 object-contain" />
              <div>
                <h2 className="text-lg font-heading font-bold text-primary uppercase leading-tight">
                  {activeBusinessName}
                </h2>
                <p className="text-[10px] text-muted font-mono uppercase">Pharmacy & Provision Store</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {activeAddress} {activePhone && `• Ph: ${activePhone}`} • GSTIN: <span className="font-mono text-gray-700">{activeGstin}</span>
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="px-2.5 py-1 rounded bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
                TAX INVOICE
              </span>
              <p className="text-sm font-bold text-primary mt-2">{bill.billNo}</p>
              <p className="text-[11px] text-gray-600">Date: {formatDate(bill.billDate)}</p>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-gray-50 font-mono text-[11px]">
            <div>
              <span className="text-muted uppercase text-[9px]">Billed To:</span>
              <p className="font-bold text-gray-900">{bill.customerName || 'Cash Customer'}</p>
              {bill.customerPhone && <p className="text-gray-600">Ph: {bill.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="text-muted uppercase text-[9px]">Payment Mode:</span>
              <p className="font-bold text-primary">{bill.paymentMode || 'Cash'}</p>
              <span className="text-[10px] text-teal-700 font-semibold">● Paid</span>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-300 font-mono text-[10px] uppercase text-gray-600 bg-gray-100/60">
                <th className="py-2 px-2">Item Description</th>
                <th className="py-2 px-2">Batch</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Rate (₹)</th>
                <th className="py-2 px-2 text-center">GST %</th>
                <th className="py-2 px-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {items.map((item, idx) => {
                const itemRef = item.itemId || {};
                const batchRef = item.batchId || {};
                const lineRate = Number(item.rate) || 0;
                const lineQty = Number(item.qty) || 0;
                const lineTotal = lineQty * lineRate;

                return (
                  <tr key={idx}>
                    <td className="py-2 px-2 font-sans font-medium text-gray-900">
                      {itemRef.name || 'Medicine / Item'}
                      {itemRef.composition && (
                        <span className="block text-[10px] text-muted font-normal">{itemRef.composition}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-700 font-semibold">{batchRef.batchNo || 'N/A'}</td>
                    <td className="py-2 px-2 text-center font-bold">{lineQty}</td>
                    <td className="py-2 px-2 text-right">₹{lineRate.toFixed(2)}</td>
                    <td className="py-2 px-2 text-center">{item.gst || 0}%</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900">₹{lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Invoice Summary Footer */}
          <div className="flex justify-end pt-3 border-t border-gray-200">
            <div className="w-64 space-y-1.5 font-mono text-xs text-right">
              <div className="flex justify-between text-muted">
                <span>Subtotal:</span>
                <span>₹{(gstBreakdown.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>CGST:</span>
                <span>₹{(gstBreakdown.cgst || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>SGST:</span>
                <span>₹{(gstBreakdown.sgst || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-primary pt-2 border-t border-gray-300">
                <span>Grand Total:</span>
                <span>₹{(bill.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-muted pt-4 border-t border-dashed border-gray-200">
            <p>Thank you for visiting {activeBusinessName} • Wish you good health!</p>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
          {/* Disabled Share Button per spec */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled
              className="gap-2 opacity-50 cursor-not-allowed text-xs"
              title="WhatsApp / SMS integration is scheduled for Phase 6.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-secondary" />
              <span>Share via WhatsApp / SMS</span>
            </Button>
            <span className="text-[10px] text-muted font-mono bg-gray-100 px-2 py-1 rounded">
              Coming in Phase 6.5
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="default" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4 text-accent" />
              <span>Print Tax Invoice</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
