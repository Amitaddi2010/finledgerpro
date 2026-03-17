import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/api';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading pages for better performance
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profitability = React.lazy(() => import('./pages/Profitability'));
const YoYComparison = React.lazy(() => import('./pages/YoYComparison'));
const FinancialRatios = React.lazy(() => import('./pages/FinancialRatios'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const PivotTable = React.lazy(() => import('./pages/PivotTable'));
const BudgetTracker = React.lazy(() => import('./pages/BudgetTracker'));
const Insights = React.lazy(() => import('./pages/Insights'));
const AuditLogs = React.lazy(() => import('./pages/AuditLogs'));
const Landing = React.lazy(() => import('./pages/Landing'));
const CompanyOnboarding = React.lazy(() => import('./pages/CompanyOnboarding'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const CompanySettings = React.lazy(() => import('./pages/CompanySettings'));
const GSTInvoices = React.lazy(() => import('./pages/GSTInvoices'));
const GSTReturns = React.lazy(() => import('./pages/GSTReturns'));
const BankReconciliation = React.lazy(() => import('./pages/BankReconciliation'));
const BalanceSheet = React.lazy(() => import('./pages/BalanceSheet'));
const Members = React.lazy(() => import('./pages/Members'));

const App: React.FC = () => {
  const { setUser, setLoading, setCompanies } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        try {
          const companiesResp = await api.get('/companies');
          setCompanies(
            companiesResp.data.companies || [],
            companiesResp.data.activeCompanyId || response.data.user?.companyId || null,
            companiesResp.data.activeRole || response.data.user?.role || null
          );
        } catch {
          setCompanies([], response.data.user?.companyId || null, response.data.user?.role || null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [setUser, setLoading, setCompanies]);

  return (
    <Router>
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
          <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding/company" element={<CompanyOnboarding />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/invoices" element={<GSTInvoices />} />
              <Route path="/gst-returns" element={<GSTReturns />} />
              <Route path="/bank-reco" element={<BankReconciliation />} />
              <Route path="/balance-sheet" element={<BalanceSheet />} />
              <Route path="/members" element={<Members />} />
              <Route path="/settings" element={<CompanySettings />} />
              <Route path="/profitability" element={<Profitability />} />
              <Route path="/yoy" element={<YoYComparison />} />
              <Route path="/ratios" element={<FinancialRatios />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/pivot" element={<PivotTable />} />
              <Route path="/budget" element={<BudgetTracker />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
};

export default App;
