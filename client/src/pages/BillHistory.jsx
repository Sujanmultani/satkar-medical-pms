import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Search, 
  Filter, 
  Printer, 
  Calendar, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { getBills } from '@/services/billService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { PrintableBill } from '@/components/PrintableBill';

export function BillHistory() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBill, setSelectedBill] = useState(null);

  const fetchBillsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await getBills(params);
      setBills(res.data || []);
    } catch (err) {
      console.error('Failed to fetch bill history:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch bill history.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBillsList();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchBillsList]);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
              <Receipt className="w-6 h-6 text-accent" />
              <span>Bill Transaction History</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Search, view, and reprint past GST sales receipts and invoices.
            </p>
          </div>

          <Button variant="default" size="sm" onClick={() => navigate('/billing')} className="gap-2">
            <Plus className="w-4 h-4 text-accent" />
            <span>Create New Bill</span>
          </Button>
        </div>

        {/* Search & Date Filters */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by Bill No or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-xs bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 text-xs font-mono bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 text-xs font-mono bg-white"
              />
            </div>

            <button
              onClick={fetchBillsList}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4-STATE PATTERN */}

        {/* STATE 1: LOADING */}
        {loading && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Fetching sales invoices...</p>
          </Card>
        )}

        {/* STATE 2: ERROR */}
        {!loading && error && (
          <Card className="p-8 border-error/30 bg-red-50/50 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-error flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-error">Failed to Load History</h3>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchBillsList} className="mt-2">
              Retry
            </Button>
          </Card>
        )}

        {/* STATE 3: EMPTY */}
        {!loading && !error && bills.length === 0 && (
          <Card className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white/90">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-primary flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">No Bills Found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                No bills recorded yet matching your filter parameters. Create your first sale invoice!
              </p>
            </div>
            <Button variant="default" size="sm" onClick={() => navigate('/billing')} className="mt-2 gap-2">
              <span>Create First Bill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        )}

        {/* STATE 4: POPULATED BILL HISTORY TABLE */}
        {!loading && !error && bills.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Bill Number</TableHead>
                <TableHead className="font-mono">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center font-mono">Items Count</TableHead>
                <TableHead className="text-center">Payment Mode</TableHead>
                <TableHead className="text-right font-mono">Total Amount (₹)</TableHead>
                <TableHead className="text-center">Print Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => {
                const isPrinted = bill.shareStatus?.printed;

                return (
                  <TableRow key={bill._id} className="hover:bg-gray-50/60">
                    <TableCell className="font-mono font-bold text-primary">{bill.billNo}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDate(bill.billDate)}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      <div>
                        <span>{bill.customerName || 'Cash Customer'}</span>
                        {bill.customerPhone && (
                          <span className="block text-xs font-mono text-muted">{bill.customerPhone}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono font-semibold">
                      {(bill.items || []).length}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {bill.paymentMode || 'Cash'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-primary text-sm">
                      ₹{(bill.totalAmount || 0).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-center">
                      {isPrinted ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Printed</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Not Printed</span>
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBill(bill)}
                        className="h-8 px-2.5 text-xs gap-1 text-secondary hover:text-secondary-dark"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Reprint</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Printable Bill Dialog */}
        <PrintableBill
          isOpen={Boolean(selectedBill)}
          onClose={() => setSelectedBill(null)}
          bill={selectedBill}
        />
      </div>
    </div>
  );
}

export default BillHistory;
