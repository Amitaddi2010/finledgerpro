import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  BarChart3, 
  Table as PivotIcon, 
  Calculator, 
  FileText, 
  ListPlus,
  LogOut, 
  Menu, 
  X,
  Target,
  History,
  Sparkles,
  ChevronDown,
  Settings,
  Building2,
  Receipt,
  Landmark,
  BookOpen,
  Users,
  Command
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import AIChatAssistant from '@/components/AIChatAssistant';
import { api } from '@/lib/api';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout: React.FC = () => {
  const { user, logout, companies, activeCompanyId, activeRole, setCompanies } = useAuthStore();
  const { financialYear, setFinancialYear, toggleDarkMode, isDarkMode } = useAppStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Transactions', path: '/transactions', icon: ListPlus, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'GST Invoices', path: '/invoices', icon: Receipt, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'GST Returns', path: '/gst-returns', icon: FileText, roles: ['super_admin', 'ca', 'auditor'] },
    { name: 'Bank Reconciliation', path: '/bank-reco', icon: Landmark, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Balance Sheet', path: '/balance-sheet', icon: BookOpen, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Profitability', path: '/profitability', icon: TrendingUp, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'YoY Comparison', path: '/yoy', icon: History, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Financial Ratios', path: '/ratios', icon: Calculator, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'AI Insights', path: '/insights', icon: Sparkles, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Pivot Table', path: '/pivot', icon: PivotIcon, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Budget Tracker', path: '/budget', icon: Target, roles: ['super_admin', 'ca', 'finance_team', 'auditor'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileText, roles: ['super_admin'] },
    { name: 'Members', path: '/members', icon: Users, roles: ['super_admin'] },
  ];

  const filteredNavItems = navItems.filter(item => {
    const role = activeRole || user?.role;
    return role && item.roles.includes(role);
  });
  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  const refreshCompanies = async () => {
    const resp = await api.get('/companies');
    setCompanies(resp.data.companies || [], resp.data.activeCompanyId || null, resp.data.activeRole || null);
  };

  const handleSwitchCompany = async (companyId: string) => {
    await api.post(`/companies/${companyId}/switch`);
    await refreshCompanies();
  };

  const fyOptions = useMemo(() => {
    const parts = String(financialYear || '').split('-');
    const startYear = parseInt(parts[0] || '0', 10);
    if (!startYear) return [financialYear];
    const prevStart = startYear - 1;
    const nextStart = startYear + 1;
    const fmt = (y: number) => `${y}-${(y + 1).toString().slice(-2)}`;
    const list = [fmt(prevStart), fmt(startYear), fmt(nextStart)];
    if (!list.includes(financialYear)) list.push(financialYear);
    return Array.from(new Set(list));
  }, [financialYear]);

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden relative">
      {/* Spotlight Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(79, 79, 241, 0.05), transparent 40%)`
        }}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "bg-[#030405] border-r border-white/5 flex flex-col transition-all duration-500 relative z-[70]",
        "fixed inset-y-0 left-0 md:relative",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#4F4FF1] flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Command className="w-6 h-6 text-white" />
          </div>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-heading font-black text-xl tracking-tighter uppercase"
            >
              FinLedger<span className="text-[#4F4FF1]">Pro</span>
            </motion.div>
          )}
          <button
            className="ml-auto p-2 rounded-lg hover:bg-white/5 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-hide">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-3 py-3 rounded-2xl transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-[#4F4FF1]/10 text-white shadow-[0_0_20px_rgba(79,79,241,0.1)]" 
                  : "hover:bg-white/[0.03] text-white/40"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active"
                      className="absolute left-0 w-1 h-6 bg-[#4F4FF1] rounded-full"
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-[#4F4FF1]" : "")} />
                  {isSidebarOpen && <span className="text-sm font-black uppercase tracking-widest">{item.name}</span>}
                  {!isSidebarOpen && (
                    <div className="fixed left-24 ml-2 px-3 py-1.5 bg-black border border-white/10 text-white text-[10px] font-mono font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap shadow-2xl">
                      {item.name}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 hidden md:block">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-4 px-3 py-3 w-full hover:bg-white/5 rounded-2xl transition-all text-white/40 group overflow-hidden"
          >
            {isSidebarOpen ? <X className="w-5 h-5 group-hover:rotate-90 transition-transform" /> : <Menu className="w-5 h-5 group-hover:scale-125 transition-transform" />}
            {isSidebarOpen && <span className="text-sm font-black uppercase tracking-widest">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-40">
        {/* Header */}
        <header className="h-24 border-b border-white/5 bg-black/40 backdrop-blur-xl px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-6 min-w-0">
            <button
              className="p-3 rounded-xl hover:bg-white/5 md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            
            <div className="hidden lg:block">
              <h1 className="text-2xl font-heading font-black italic tracking-tighter uppercase">
                {navItems.find(item => location.pathname === item.path)?.name || 'HUB'}
              </h1>
            </div>

            <div className="h-8 w-px bg-white/5 mx-2 hidden sm:block" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 bg-white/[0.03] border border-white/5 hover:border-[#4F4FF1]/30 px-4 py-2 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest transition-all hover:scale-[1.02]">
                  <Building2 className="w-4 h-4 text-[#4F4FF1]" />
                  <span className="max-w-[200px] truncate">{activeCompany?.name || 'Select Entity'}</span>
                  <ChevronDown className="w-4 h-4 text-white/20" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 bg-black border-white/5 p-2 rounded-2xl">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-4 py-3">Switch Entity</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {companies.length === 0 ? (
                  <DropdownMenuItem onClick={() => navigate('/onboarding/company')} className="rounded-xl">
                    Create New Entity
                  </DropdownMenuItem>
                ) : (
                  companies.map((c) => (
                    <DropdownMenuItem 
                      key={c.id} 
                      onClick={() => handleSwitchCompany(c.id)}
                      className="rounded-xl p-4 focus:bg-[#4F4FF1]/10 transition-colors cursor-pointer mb-1"
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="font-black uppercase tracking-wider text-xs">{c.name}</span>
                        <div className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black uppercase tracking-widest text-white/40">
                          {c.role.replace('_', ' ')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => navigate('/onboarding/company')} className="rounded-xl mt-1 text-[#4F4FF1] font-black uppercase tracking-widest text-[10px]">
                  Manage Entities
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative hidden sm:block">
              <select 
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="bg-white/[0.03] border border-white/5 text-[10px] font-mono font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl hover:border-[#4F4FF1]/30 transition-all outline-none appearance-none pr-10 cursor-pointer"
              >
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy} className="bg-black">
                    FY {fy}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={toggleDarkMode}
              className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center hover:bg-[#4F4FF1]/10 transition-all group"
            >
              <Sparkles className={cn("w-5 h-5 transition-all group-hover:scale-125", isDarkMode ? "text-amber-400" : "text-white/20")} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 cursor-pointer group">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-black uppercase tracking-widest">{user?.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#4F4FF1] font-black mt-0.5">
                      {(activeRole || user?.role || '').replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#4F4FF1] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-black border-white/5 p-2 rounded-2xl mt-2 shadow-2xl">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-4 py-3">Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-xl p-3 focus:bg-white/5 cursor-pointer">
                  <Settings className="w-4 h-4 mr-3 text-white/40" />
                  <span className="font-bold text-sm">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem 
                  className="rounded-xl p-3 focus:bg-red-500/10 text-red-500 cursor-pointer" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="font-bold text-sm">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-grid bg-fixed backdrop-blur-[2px]">
          <div className="max-w-[1600px] mx-auto">
             <Outlet />
          </div>
        </main>

        <AIChatAssistant />
      </div>
    </div>
  );
};

export default DashboardLayout;
