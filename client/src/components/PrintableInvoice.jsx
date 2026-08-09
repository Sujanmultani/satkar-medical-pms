import React from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer, MessageCircle } from 'lucide-react';
import { buildWhatsAppInvoiceMessage, getWhatsAppShareLink } from '@/utils/whatsappBill';

export function PrintableInvoice({ isOpen, onClose, invoice }) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const message = buildWhatsAppInvoiceMessage(invoice);
    const waUrl = getWhatsAppShareLink(null, message);
    window.open(waUrl, '_blank');
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const items = invoice.items || [];
  const gstBreakdown = invoice.gstBreakdown || {};

  const renderPaperContent = () => (
    <div className="space-y-6">
      {/* Invoice Header */}
      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src={logoAsset} alt="Satkar Logo" className="w-12 h-12 object-contain" />
          <div>
            <h2 className="text-lg font-heading font-bold text-primary uppercase leading-tight">
              Satkar Medical
            </h2>
            <p className="text-[10px] text-muted font-mono uppercase">Purchase Invoice Record</p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="px-2.5 py-1 rounded bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
            PURCHASE INVOICE
          </span>
          <p className="text-sm font-bold text-primary mt-2">{invoice.invoiceNo}</p>
          <p className="text-[11px] text-gray-600">Date: {formatDate(invoice.invoiceDate)}</p>
        </div>
      </div>

      {/* Supplier Meta */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-gray-50 font-mono text-[11px]">
        <div>
          <span className="text-muted uppercase text-[9px]">Supplier / Distributor:</span>
          <p className="font-bold text-gray-900">{invoice.supplierName || 'Unspecified Supplier'}</p>
        </div>
        <div className="text-right">
          <span className="text-muted uppercase text-[9px]">Status:</span>
          <p className="font-bold text-primary capitalize">{invoice.status || 'confirmed'}</p>
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
          {items.map((itemEntry, idx) => {
            const ext = itemEntry.extractedData || {};
            const batch = itemEntry.batch || {};
            const liveItem = batch.itemId || {};

            const name = liveItem.name || ext.name || 'Item';
            const comp = liveItem.composition || ext.composition || '';
            const batchNo = batch.batchNo || ext.batchNo || 'N/A';
            const qty = Number(batch.initialQty !== undefined ? batch.initialQty : ext.qty) || 0;
            const freeQty = Number(batch.freeQty !== undefined ? batch.freeQty : ext.freeQty) || 0;
            const rate = Number(batch.purchaseRate !== undefined ? batch.purchaseRate : ext.purchaseRate) || 0;
            const gst = Number(batch.gstPercent !== undefined ? batch.gstPercent : ext.gstPercent) || 0;
            const paidQty = Number(ext.qty) || (qty - freeQty);
            const lineTotal = paidQty * rate;

            return (
              <tr key={idx}>
                <td className="py-2 px-2 font-sans font-medium text-gray-900">
                  <span>{name}</span>
                  {comp && <span className="block text-[10px] text-muted font-normal">{comp}</span>}
                </td>
                <td className="py-2 px-2 text-gray-700 font-semibold">{batchNo}</td>
                <td className="py-2 px-2 text-center font-bold">
                  <span>{qty}</span>
                  {freeQty > 0 && <span className="text-teal-700 text-[9px] font-semibold block">(+{freeQty} Free)</span>}
                </td>
                <td className="py-2 px-2 text-right">₹{rate.toFixed(2)}</td>
                <td className="py-2 px-2 text-center">{gst}%</td>
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
            <span>CGST:</span>
            <span>₹{Number(gstBreakdown.cgst || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>SGST:</span>
            <span>₹{Number(gstBreakdown.sgst || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-primary pt-2 border-t border-gray-300">
            <span>Grand Total:</span>
            <span>₹{Number(invoice.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-muted pt-4 border-t border-dashed border-gray-200">
        <p>Scanned &amp; saved via Satkar Inventory System</p>
      </div>
    </div>
  );

  return (
    <>
      {/* On-screen Preview Dialog */}
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={`Purchase Invoice — ${invoice.invoiceNo}`}
        description="Printable purchase invoice record"
        className="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-gray-200 text-xs text-text shadow-sm">
            {renderPaperContent()}
          </div>

          {/* Modal Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleWhatsAppShare}
                className="gap-2 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                title="Share invoice via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Share via WhatsApp</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button variant="default" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4 text-accent" />
                <span>Print Invoice</span>
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Body Portal for Print Layout */}
      {createPortal(
        <div id="printable-invoice-area" className="hidden print:block p-6 bg-white text-xs text-text">
          {renderPaperContent()}
        </div>,
        document.body
      )}
    </>
  );
}

export default PrintableInvoice;
