import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBillByShareToken } from '@/services/billService';
import { getSettings } from '@/services/settingsService';
import logoAsset from '@/assets/satkar-logo.jpeg';
import { Printer, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { roundMoney } from '@/utils/money';
import { Button } from '@/components/ui/Button';

export function SharedBillView() {
  const { token } = useParams();
  const [bill, setBill] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPublicBill() {
      setLoading(true);
      setError(null);
      try {
        const [billRes, settingsRes] = await Promise.allSettled([
          getBillByShareToken(token),
          getSettings(),
        ]);

        if (billRes.status === 'fulfilled' && billRes.value?.data) {
          setBill(billRes.value.data);
        } else {
          setError('Bill not found or the share link has expired.');
        }

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
          setSettings(settingsRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load public bill view:', err);
        setError('Bill not found or the share link has expired.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadPublicBill();
    } else {
      setError('Invalid share link.');
      setLoading(false);
    }
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeBusinessName = settings?.businessName || 'Satkar Medical';
  const activeGstin = settings?.gstin || '[Not Configured]';
  const activeAddress = settings?.address || 'Main Road, Jambusar';
  const activePhone = settings?.phone || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-600 font-medium">Loading Tax Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-6 bg-white rounded-2xl border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Invoice Unavailable</h2>
          <p className="text-xs text-gray-600">{error || 'The requested tax invoice could not be found.'}</p>
        </div>
      </div>
    );
  }

  const items = bill.items || [];
  const gstBreakdown = bill.gstBreakdown || {};

  return (
    <div className="min-h-screen bg-gray-100/70 p-4 md:p-8 font-sans print:p-0 print:bg-white">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* On-screen Header Bar */}
        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-semibold text-teal-900">Verified Digital Invoice</span>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-2 text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </Button>
        </div>

        {/* Paper Invoice Container */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs text-gray-900 print:shadow-none print:border-none print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img src={logoAsset} alt="Satkar Logo" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-teal-900 uppercase leading-tight">
                  {activeBusinessName}
                </h1>
                <p className="text-[10px] text-gray-500 font-mono uppercase">Pharmacy & Provision Store</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {activeAddress} {activePhone && `• Ph: ${activePhone}`} • GSTIN: <span className="font-mono text-gray-800">{activeGstin}</span>
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="px-2.5 py-1 rounded bg-teal-100 text-teal-900 font-bold text-xs uppercase tracking-wider">
                TAX INVOICE
              </span>
              <p className="text-sm font-bold text-teal-900 mt-2">{bill.billNo}</p>
              <p className="text-[11px] text-gray-600">Date: {formatDate(bill.billDate)}</p>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-gray-50 font-mono text-[11px]">
            <div>
              <span className="text-gray-500 uppercase text-[9px]">Billed To:</span>
              <p className="font-bold text-gray-900">{bill.customerName || 'Cash Customer'}</p>
              {bill.customerPhone && <p className="text-gray-600">Ph: {bill.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="text-gray-500 uppercase text-[9px]">Payment Mode:</span>
              <p className="font-bold text-teal-800">{bill.paymentMode || 'Cash'}</p>
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
                const lineTotal = roundMoney(lineQty * lineRate);

                return (
                  <tr key={idx}>
                    <td className="py-2 px-2 font-sans font-medium text-gray-900">
                      <span>{itemRef.name || 'Medicine / Item'}</span>
                      {itemRef.composition && (
                        <span className="block text-[10px] text-gray-500 font-normal">{itemRef.composition}</span>
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
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{(gstBreakdown.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CGST:</span>
                <span>₹{(gstBreakdown.cgst || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST:</span>
                <span>₹{(gstBreakdown.sgst || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-teal-900 pt-2 border-t border-gray-300">
                <span>Grand Total:</span>
                <span>₹{(bill.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-500 pt-4 border-t border-dashed border-gray-200">
            <p>Thank you for visiting {activeBusinessName} • Wish you good health!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SharedBillView;
