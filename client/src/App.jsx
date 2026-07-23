import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { StockList } from '@/pages/StockList';
import { ProvisionStore } from '@/pages/ProvisionStore';
import { InvoiceScan } from '@/pages/InvoiceScan';
import { ExpiryAlerts } from '@/pages/ExpiryAlerts';
import { CompositionSearch } from '@/pages/CompositionSearch';
import { Billing } from '@/pages/Billing';
import { BillHistory } from '@/pages/BillHistory';
import { Sidebar } from '@/components/Sidebar';

// Protected Route Wrapper
function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar renders ONLY on authenticated routes */}
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stock" element={<StockList />} />
          <Route path="/medical-stock" element={<StockList />} />
          <Route path="/provision" element={<ProvisionStore />} />
          <Route path="/provision-store" element={<ProvisionStore />} />
          <Route path="/invoice-scan" element={<InvoiceScan />} />
          <Route path="/expiry-alerts" element={<ExpiryAlerts />} />
          <Route path="/composition-search" element={<CompositionSearch />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/bill-history" element={<BillHistory />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Public Route Wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Router>
  );
}
