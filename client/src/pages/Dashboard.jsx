import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Pill, 
  ShoppingBag, 
  ScanLine, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Clock, 
  Sparkles 
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="relative min-h-screen p-8 overflow-hidden bg-background">
      {/* Background Watermark at subtle 4% opacity */}
      <LogoWatermark opacity={0.04} scale={1.2} position="bottom-right" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface p-6 rounded-2xl border border-primary/10 shadow-card">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-secondary mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Satkar Medical PMS • Phase 1 Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary font-heading">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-sm text-muted mt-1">
              System initialized with v2 Satkar Medical logo palette & design framework.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full bg-accent/15 text-accent font-semibold text-xs font-mono border border-accent/20">
              ● System Online
            </span>
          </div>
        </div>

        {/* Quick Summary Cards (Phase 1 Placeholders) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:border-secondary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Medical Stock</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">--</div>
              <p className="text-xs text-muted mt-1">Ready for Phase 2</p>
            </CardContent>
          </Card>

          <Card className="hover:border-secondary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Provision Store</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-secondary">--</div>
              <p className="text-xs text-muted mt-1">Ready for Phase 2</p>
            </CardContent>
          </Card>

          <Card className="hover:border-secondary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Expiry Alerts</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-text">0</div>
              <p className="text-xs text-muted mt-1">Phase 4 Automation</p>
            </CardContent>
          </Card>

          <Card className="hover:border-secondary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono text-muted uppercase">Today's Bills</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-accent">₹ 0.00</div>
              <p className="text-xs text-muted mt-1">Phase 6 Billing</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase 1 Readiness Banner */}
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-secondary" />
              Phase 1 Deliverables Verified
            </CardTitle>
            <CardDescription>
              All backend schemas, JWT security, initial registration, auth state management, and logo-based UI design system components are active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-text/80">
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Backend Mongoose Models (5/5)</span>
                <span className="text-success font-semibold">Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• JWT Token Auth & Middleware</span>
                <span className="text-success font-semibold">Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• Satkar v2 Logo Watermark</span>
                <span className="text-success font-semibold">Active</span>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-gray-200/60 flex items-center justify-between">
                <span>• react-bits Teal Aurora Hero</span>
                <span className="text-success font-semibold">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
