import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getDashboardSummary } from '@/services/dashboardService';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ScanLine
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    totalItems: 0,
    totalBatchQty: 0,
    todaySales: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <div className="relative min-h-screen p-6 md:p-8 overflow-hidden bg-background">
      {/* Background Watermark at subtle 4% opacity */}
      <LogoWatermark opacity={0.04} scale={1.2} position="bottom-right" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface p-6 rounded-2xl border border-primary/10 shadow-card">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-secondary mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Satkar Medical PMS • Phase 4 Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-heading">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-sm text-muted mt-1">
              Real-time stock metrics, invoice scanning, and automated expiry tracking.
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

        {/* Real-Time Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Phase Progress Banner */}
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              System Status Overview
            </CardTitle>
            <CardDescription>
              Phase 1 to 4 features are active and connected to MongoDB Atlas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text/80">
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Medical & Provision Stock CRUD</span>
                <span className="text-success font-semibold">Phase 2 Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Google Vision OCR Invoice Scanner</span>
                <span className="text-success font-semibold">Phase 3 Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Daily Expiry Cron & Bulk Status Update</span>
                <span className="text-success font-semibold">Phase 4 Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Billing & GST Cash Register</span>
                <span className="text-muted font-semibold">Phase 6 Upcoming</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
