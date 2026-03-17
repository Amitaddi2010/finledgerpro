import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase, 
  DollarSign, 
  Activity, 
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { formatINRCurrency, toLakhsCrores } from '@/lib/formatINR';
import { exportToCsv } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { financialYear, setChatOpen } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [pl, trend, ratios, yoy] = await Promise.all([
          api.get(`/reports/pl-statement?financialYear=${financialYear}`),
          api.get(`/analytics/charts/revenue-expense-trend?financialYear=${financialYear}`),
          api.get(`/reports/ratios?financialYear=${financialYear}`),
          api.get(`/reports/yoy-comparison?financialYear=${financialYear}`),
        ]);
        setData({
          pl: pl.data,
          trend: trend.data,
          ratios: ratios.data,
          yoy: yoy.data,
        });
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [financialYear]);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => <div key={i} className="h-40 glass-card rounded-[2rem]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[500px] glass-card rounded-[2rem]" />
          <div className="h-[500px] glass-card rounded-[2rem]" />
        </div>
      </div>
    );
  }

  const revenue = data?.pl?.totals?.revenue || 0;
  const netProfit = data?.pl?.totals?.netProfit || 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const yoyMetrics: any[] = data?.yoy?.metrics || [];
  const yoyRevenuePct = yoyMetrics.find(m => m.metric === 'Revenue')?.yoyDeltaPct;
  const yoyProfitPct = yoyMetrics.find(m => m.metric === 'Net Profit')?.yoyDeltaPct;
  const yoyNetMarginPct = (Number.isFinite(yoyRevenuePct) && Number.isFinite(yoyProfitPct))
    ? (netMargin - (data?.yoy?.metrics?.find((m: any) => m.metric === 'Net Profit')?.prevActual && data?.yoy?.metrics?.find((m: any) => m.metric === 'Revenue')?.prevActual
        ? ((data.yoy.metrics.find((m: any) => m.metric === 'Net Profit').prevActual) / (data.yoy.metrics.find((m: any) => m.metric === 'Revenue').prevActual)) * 100
        : 0))
    : undefined;

  const ratioCurrent = data?.ratios?.ratios?.currentRatio;
  const ratioPrev = data?.ratios?.trend?.slice(-2)?.[0]?.ratios?.currentRatio;
  const ratioDelta = (typeof ratioCurrent === 'number' && typeof ratioPrev === 'number') ? (ratioCurrent - ratioPrev) : 0;

  const fmtPct = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—');
  const fmtRatioLabel = () => {
    if (typeof ratioCurrent !== 'number') return '—';
    if (ratioCurrent >= 1.5) return 'Healthy';
    if (ratioCurrent >= 1.0) return 'Watch';
    return 'Risk';
  };

  const stats = [
    {
      label: 'Total Revenue',
      value: revenue,
      trend: fmtPct(yoyRevenuePct),
      isUp: typeof yoyRevenuePct === 'number' ? yoyRevenuePct >= 0 : true,
      icon: DollarSign,
      color: 'text-[#4F4FF1]'
    },
    {
      label: 'Net Profit',
      value: netProfit,
      trend: fmtPct(yoyProfitPct),
      isUp: typeof yoyProfitPct === 'number' ? yoyProfitPct >= 0 : true,
      icon: TrendingUp,
      color: 'text-emerald-500'
    },
    {
      label: 'Net Margin',
      value: netMargin,
      isPercent: true,
      trend: typeof yoyNetMarginPct === 'number' && Number.isFinite(yoyNetMarginPct) ? `${yoyNetMarginPct >= 0 ? '+' : ''}${yoyNetMarginPct.toFixed(1)} pp` : '—',
      isUp: typeof yoyNetMarginPct === 'number' ? yoyNetMarginPct >= 0 : netMargin >= 0,
      icon: Activity,
      color: 'text-amber-500'
    },
    {
      label: 'Current Ratio',
      value: ratioCurrent || 0,
      isRatio: true,
      trend: `${fmtRatioLabel()}${ratioDelta !== 0 ? ` (${ratioDelta >= 0 ? '+' : ''}${ratioDelta.toFixed(2)})` : ''}`,
      isUp: ratioDelta >= 0,
      icon: Briefcase,
      color: 'text-indigo-400'
    },
  ];

  const downloadSummary = () => {
    if (!data) return;
    const headers = ['Metric', 'Current Value', 'Previous Value', 'Growth %'];
    const rows = [
      ['Revenue', revenue, data.yoy?.summary?.revenue?.previous || 0, yoyRevenuePct],
      ['Net Profit', netProfit, data.yoy?.summary?.netProfit?.previous || 0, yoyProfitPct],
      ['Net Margin', `${netMargin.toFixed(1)}%`, '-', yoyNetMarginPct],
      ['Current Ratio', ratioCurrent, ratioPrev, ratioDelta]
    ];
    exportToCsv(`Dashboard-Summary-${financialYear}.csv`, headers, rows);
  };

  return (
    <div className="space-y-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
         <div>
            <h2 className="text-4xl font-heading font-black italic tracking-tighter uppercase transition-colors hover:text-[#4F4FF1]">Command Center</h2>
            <p className="text-white/40 font-mono font-black uppercase tracking-[0.3em] text-[10px] mt-2">Intelligence Overview • FY {financialYear}</p>
         </div>
         <div className="flex gap-4">
            <button 
              onClick={downloadSummary}
              className="px-6 py-3 glass border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
            >
              Download Report
            </button>
            <button 
              onClick={() => setChatOpen(true)}
              className="px-6 py-3 bg-[#4F4FF1] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3F3FE1] transition-all flex items-center gap-2"
            >
               <Sparkles className="w-4 h-4" /> Ask AI
            </button>
         </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8">
               <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/5 group-hover:scale-110 transition-transform", stat.color)}>
                 <stat.icon className="w-6 h-6" />
               </div>
            </div>

            <div className="space-y-6">
               <div className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-white/20">{stat.label}</div>
               <div className="text-4xl font-heading font-black tracking-tighter">
                 {stat.isPercent ? `${stat.value.toFixed(1)}%` : stat.isRatio ? stat.value.toFixed(2) : toLakhsCrores(stat.value)}
               </div>
               <div className={cn(
                 "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-tighter",
                 stat.isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
               )}>
                 {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                 {stat.trend}
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-[2.5rem] p-12"
        >
          <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-2xl font-heading font-black italic tracking-tighter uppercase">Market Velocity</h3>
               <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-white/20 mt-1">Revenue vs OPEX Trends</p>
            </div>
            <div className="flex gap-6 text-[10px] font-mono font-black uppercase tracking-[0.4em]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4F4FF1]" /> Revenue
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" /> Expenses
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={data?.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)', fontWeight: 900 }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)', fontWeight: 900 }}
                  tickFormatter={(val) => `₹${val / 100000}L`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{
                    backgroundColor: '#000',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    padding: '20px'
                  }}
                  itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  formatter={(value: any) => [formatINRCurrency(value), '']}
                />
                <Bar dataKey="currentRevenue" fill="#4F4FF1" radius={[6, 6, 0, 0]} barSize={28} />
                <Bar dataKey="currentExpense" fill="rgba(255,255,255,0.1)" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Ratios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-[2.5rem] p-12"
        >
           <div className="flex items-center justify-between mb-12">
            <div>
               <h3 className="text-2xl font-heading font-black italic tracking-tighter uppercase">Ratio Grid</h3>
               <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-white/20 mt-1">Liquidity & Solvency</p>
            </div>
            <Activity className="w-6 h-6 text-[#4F4FF1]" />
          </div>
          <div className="space-y-4">
            {['currentRatio', 'quickRatio', 'debtToEquity', 'returnOnEquity'].map((key) => {
              const val = data?.ratios?.trend?.slice(-1)[0]?.ratios[key] || 0;
              const prev = data?.ratios?.trend?.slice(-2)[0]?.ratios[key] || 0;
              const isImproved = key === 'currentRatio' || key === 'quickRatio' ? val > prev : val < prev;

              return (
                <div key={key} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                  <div>
                    <div className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-white/20 mb-1 group-hover:text-white/60 transition-colors">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xl font-heading font-black tracking-tighter">{val.toFixed(2)}{key.includes('Equity') && key !== 'debtToEquity' ? '%' : ''}</div>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                    isImproved ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"
                  )}>
                    {isImproved ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-12 pt-8 border-t border-white/5">
            <div className="flex items-center gap-3 text-[9px] font-mono font-black uppercase tracking-[0.4em] text-white/10">
              <Clock className="w-3 h-3 text-[#4F4FF1]" />
              <span>Synced {new Date().toLocaleTimeString('en-IN')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
