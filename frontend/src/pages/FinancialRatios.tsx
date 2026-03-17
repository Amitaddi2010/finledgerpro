import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Activity, 
  Layers, 
  Briefcase, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar 
} from 'recharts';

const FinancialRatios: React.FC = () => {
  const { financialYear } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatios = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/reports/ratios?financialYear=${financialYear}`);
        setData(response.data);
      } catch (err) {
        console.error("Ratios fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRatios();
  }, [financialYear]);

  if (loading) return <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl dark:bg-slate-800" />)}
    </div>
  </div>;

  const categories = [
    { title: 'Liquidity Ratios', key: 'liquidity', icon: Activity, color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { title: 'Profitability Ratios', key: 'profitability', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { title: 'Solvency Ratios', key: 'solvency', icon: Layers, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    { title: 'Efficiency Ratios', key: 'efficiency', icon: Briefcase, color: 'text-purple-500 bg-purple-50 border-purple-100' }
  ];

  const ratioDefinitions: Record<string, string> = {
    currentRatio: "Measures ability to pay short-term obligations with current assets.",
    quickRatio: "Measures ability to meet short-term obligations without selling inventory.",
    grossMargin: "Percentage of revenue exceeding cost of goods sold.",
    netMargin: "Percentage of revenue remaining after all expenses and taxes.",
    returnOnEquity: "Measures profitability relative to shareholders' equity.",
    debtToEquity: "Relative proportion of shareholders' equity and debt used to finance assets.",
    assetTurnover: "Efficiency of using assets to generate revenue."
  };

  // Prepare data for Radar Chart (Efficiency)
  const radarData = [
    { subject: 'ROA', A: data?.ratios?.returnOnAssets || 0, fullMark: 20 },
    { subject: 'ROE', A: data?.ratios?.returnOnEquity || 0, fullMark: 30 },
    { subject: 'Turnover', A: data?.ratios?.assetTurnover || 0, fullMark: 5 },
    { subject: 'Margin', A: data?.ratios?.netMargin || 0, fullMark: 25 },
    { subject: 'Efficiency', A: data?.ratios?.inventoryTurnover || 0, fullMark: 10 },
  ];

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center bg-card border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-primary" /> Financial Ratios Dashboard
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Real-time health pulse for FY {financialYear}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-positive/10 text-positive rounded-full text-xs font-black uppercase tracking-widest border border-positive/20">
          <Activity className="w-4 h-4" /> Healthy Outlook
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Ratios Grid */}
        <div className="lg:col-span-3 space-y-10">
          {categories.map(cat => (
            <section key={cat.key} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg border", cat.color)}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-black text-lg tracking-tight uppercase text-slate-700 dark:text-slate-300">{cat.title}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(data?.ratios || {})
                  .filter(([key]) => {
                     if (cat.key === 'liquidity') return ['currentRatio', 'quickRatio', 'cashRatio'].includes(key);
                     if (cat.key === 'profitability') return ['grossMargin', 'operatingMargin', 'netMargin', 'returnOnEquity', 'returnOnAssets', 'returnOnCapitalEmployed'].includes(key);
                     if (cat.key === 'solvency') return ['debtToEquity', 'equityMultiplier', 'interestCoverageRatio', 'debtToAssets'].includes(key);
                     if (cat.key === 'efficiency') return ['assetTurnover', 'inventoryTurnover', 'receivablesTurnover', 'payablesTurnover'].includes(key);
                     return false;
                  })
                  .map(([key, value]: [string, any]) => (
                    <div key={key} className="group relative bg-card border px-6 py-5 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div title={ratioDefinitions[key] || "Financial metric"}>
                             <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-mono font-black tracking-tighter">
                          {value.toFixed(2)}{['Margin', 'Equity', 'Assets', 'Employed'].some(s => key.includes(s)) ? '%' : ''}
                        </div>
                        {/* Placeholder trend logic */}
                        <div className="text-[10px] font-bold text-positive flex items-center">
                          <ArrowUpRight className="w-3 h-3" /> 2.4%
                        </div>
                      </div>

                      {/* Small inline sparkline/bar */}
                      <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                             "h-full rounded-full",
                             cat.key === 'liquidity' ? "bg-blue-500" : cat.key === 'profitability' ? "bg-emerald-500" : "bg-amber-500"
                          )}
                          style={{ width: `${Math.min(key.includes('Margin') ? value : value * 20, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar Viz */}
        <div className="space-y-8">
           <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-heading font-bold text-sm uppercase tracking-widest text-white/50 mb-6">Efficiency Profile</h4>
                <div className="h-[300px] -mx-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }} />
                      <Radar
                        name="Ratios"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed mt-4">
                  This radar map visualizes your firm's operational efficiency across 5 dimensions. A wider area indicates a more balanced financial health.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -mr-16 -mt-16" />
           </div>

           <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h4 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" /> Watchlist
              </h4>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-warning/5 border border-warning/10 text-xs">
                  <div className="font-black text-warning uppercase tracking-tighter mb-1">Debt-to-Equity</div>
                   The leverage is approaching 1.5x. Consider refinancing long-term liabilities.
                </div>
                <div className="p-3 rounded-xl bg-positive/5 border border-positive/10 text-xs text-muted-foreground">
                  <div className="font-black text-positive uppercase tracking-tighter mb-1">Receivables Turnover</div>
                   Improving. Average collection period reduced by 4 days this quarter.
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialRatios;
