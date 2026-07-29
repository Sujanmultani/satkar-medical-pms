import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getDashboardSummary } from '@/services/dashboardService';
import { getSettings, updateSettings } from '@/services/settingsService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  Clock, 
  Sparkles,
  ArrowRight,
  ScanLine,
  TrendingUp,
  Percent,
  Check
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    totalItems: 0,
    totalBatchQty: 0,
    todaySales: 0,
    totalRevenue: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [defaultGstRate, setDefaultGstRate] = useState('0');
  const [isSavingGst, setIsSavingGst] = useState(false);
  const [gstSaveSuccess, setGstSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, setRes] = await Promise.all([
          getDashboardSummary(),
          getSettings()
        ]);
        const sumData = sumRes?.data || sumRes || {};
        setSummary(sumData);

        const setData = setRes?.data || setRes || {};
        if (setData.defaultGstPercent !== undefined && setData.defaultGstPercent !== null) {
          setDefaultGstRate(String(setData.defaultGstPercent));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveGstOnDashboard = async (e) => {
    e.preventDefault();
    setIsSavingGst(true);
    setGstSaveSuccess(false);
    try {
      const val = Number(defaultGstRate) || 0;
      await updateSettings({ defaultGstPercent: val });
      setGstSaveSuccess(true);
      setTimeout(() => setGstSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update GST rate from dashboard:', err);
    } finally {
      setIsSavingGst(false);
    }
  };

  return (
    <div className="relative min-h-screen p-6 md:p-8 overflow-hidden bg-background">
      {/* Background Watermark at prominent 12% opacity */}
      <LogoWatermark opacity={0.12} scale={1.4} position="center" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface p-6 rounded-2xl border border-primary/10 shadow-card">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-secondary mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Satkar Medical PMS • Pharmacy & Provision</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-heading">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-sm text-muted mt-1">
              Real-time stock metrics, invoice scanning, billing, and automated expiry tracking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/invoice-scan')}
              className="gap-2"
            >
              <ScanLine className="w-4 h-4 text-accent" />
              <span>Scan Invoice</span>
            </Button>
          </div>
        </div>

        {/* Admin Default GST Setting Banner Card */}
        <Card className="p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-teal-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-primary flex items-center gap-2">
                  <span>Default Billing GST Rate (%)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
                    Auto-Fills in Billing
                  </span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Set default GST % rate (e.g. 10, 12, 5, 0, 18). Whatever number set here auto-fills on sales billing.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveGstOnDashboard} className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="relative w-28">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(e.target.value)}
                  className="text-sm font-mono font-bold text-center border-teal-300 focus:border-teal-600 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-700">%</span>
              </div>

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSavingGst}
                className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              >
                {gstSaveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save GST</span>
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Real-Time Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Net Sales Card */}
          <Card 
            onClick={() => navigate('/billing')}
            className="hover:border-emerald-400 transition-all cursor-pointer border-l-4 border-l-emerald-500 bg-emerald-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-emerald-800 uppercase">Today's Net Sales</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-900">
                ₹{loading ? '...' : (summary.todaySales || 0).toFixed(2)}
              </div>
              <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                <span>{summary.todayCustomerReturnRefunds > 0 ? `Gross ₹${summary.todayGrossSales.toFixed(2)} - Returns ₹${summary.todayCustomerReturnRefunds.toFixed(2)}` : 'Net sales today'}</span>
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue Card */}
          <Card 
            onClick={() => navigate('/bill-history')}
            className="hover:border-teal-400 transition-all cursor-pointer border-l-4 border-l-teal-600 bg-teal-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-teal-900 uppercase">Total Revenue</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-teal-950">
                ₹{loading ? '...' : (summary.totalRevenue || 0).toFixed(2)}
              </div>
              <p className="text-xs text-teal-700 mt-1 flex items-center gap-1">
                <span>All-Time Net Revenue</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>

          {/* Customer Returns Card */}
          <Card 
            onClick={() => navigate('/returns-history?tab=customer')}
            className="hover:border-blue-400 transition-all cursor-pointer border-l-4 border-l-blue-500 bg-blue-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-blue-800 uppercase">Customer Returns</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-blue-900">
                {loading ? '...' : summary.customerReturnsCount || 0}
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Total Refunded: <strong>₹{(summary.customerReturnsAmount || 0).toFixed(2)}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Supplier Expired Returns Card */}
          <Card 
            onClick={() => navigate('/returns-history?tab=supplier')}
            className="hover:border-amber-400 transition-all cursor-pointer border-l-4 border-l-amber-500 bg-amber-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-amber-800 uppercase">Supplier Expired Returns</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-900">
                {loading ? '...' : summary.expiredReturnsCount || 0}
              </div>
              <p className="text-xs text-amber-700 mt-1">Returned expired vouchers</p>
            </CardContent>
          </Card>

          {/* Total Items */}
          <Card 
            onClick={() => navigate('/stock')}
            className="hover:border-primary/40 transition-all cursor-pointer border-l-4 border-l-primary"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Total Items</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">
                {loading ? '...' : summary.totalItems}
              </div>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <span>View Inventory</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>

          {/* Total Stock Quantity */}
          <Card className="hover:border-secondary/40 transition-all border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Total Stock Qty</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-secondary-dark">
                {loading ? '...' : summary.totalBatchQty}
              </div>
              <p className="text-xs text-muted mt-1">Across all active batches</p>
            </CardContent>
          </Card>

          {/* Expiring Soon Card */}
          <Card 
            onClick={() => navigate('/expiry-alerts?tab=expiring')}
            className="hover:border-amber-400 transition-all cursor-pointer border-l-4 border-l-amber-500 bg-amber-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-amber-800 uppercase">Expiring Soon (30d)</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-800">
                {loading ? '...' : summary.expiringSoonCount}
              </div>
              <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                <span>Check Alerts</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>

          {/* Expired Card */}
          <Card 
            onClick={() => navigate('/expiry-alerts?tab=expired')}
            className="hover:border-red-400 transition-all cursor-pointer border-l-4 border-l-red-500 bg-red-50/20"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-red-800 uppercase">Already Expired</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-red-800">
                {loading ? '...' : summary.expiredCount}
              </div>
              <p className="text-xs text-red-700 mt-1 flex items-center gap-1">
                <span>Action Required</span>
                <ArrowRight className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
