import React, { useState, useEffect } from 'react';
import { 
  Sparkles,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { formatINR, toLakhsCrores } from '@/lib/formatINR';
import { cn } from '@/lib/utils';

const YoYComparison: React.FC = () => {
  const { financialYear } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYoY = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/reports/yoy-comparison?financialYear=${financialYear}`);
        setData(response.data);
      } catch (err) {
        console.error("YoY fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchYoY();
  }, [financialYear]);

  if (loading) return <div className="space-y-8 animate-pulse">
    <div className="h-48 bg-slate-200 rounded-2xl dark:bg-slate-800" />
    <div className="h-[400px] bg-slate-200 rounded-2xl dark:bg-slate-800" />
  </div>;

  const metrics = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'netProfit', label: 'Net Profit' }
  ];

  return (
    <div className="space-y-8">
       {/* High Level Comparison */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {metrics.map(m => {
           const current = data?.summary?.[m.key]?.current || 0;
           const previous = data?.summary?.[m.key]?.previous || 0;
           const target = data?.summary?.[m.key]?.target || 0;
           const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
           const targetAchievement = target > 0 ? (current / target) * 100 : 0;
           
           return (
             <div key={m.key} className="bg-card border p-6 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground">{m.label}</h3>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                    growth >= 0 ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive"
                  )}>
                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% vs LY
                  </div>
                </div>
                
                <div className="flex items-end gap-3 mb-6">
                  <div className="text-3xl font-mono font-black tracking-tighter">{toLakhsCrores(current)}</div>
                  <div className="text-xs text-muted-foreground mb-1">LY: {toLakhsCrores(previous)}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Yearly Target</span>
                    <span>{targetAchievement.toFixed(1)}% Achieved</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        targetAchievement >= 100 ? "bg-positive" : targetAchievement >= 75 ? "bg-accent" : "bg-warning"
                      )} 
                      style={{ width: `${Math.min(targetAchievement, 100)}%` }} 
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground flex justify-between">
                    <span>₹0</span>
                    <span>Target: {toLakhsCrores(target)}</span>
                  </div>
                </div>
             </div>
           );
         })}
       </div>

       {/* Interactive Trend Overlay */}
       <div className="bg-card border p-8 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h2 className="text-xl font-heading font-black tracking-tight flex items-center gap-2">
                Trend Overlay <Sparkles className="w-5 h-5 text-accent" />
              </h2>
              <p className="text-muted-foreground text-sm font-medium">Comparing Actuals vs Previous Year vs Prorated Targets</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-xs font-bold">
                 <div className="w-3 h-[2px] bg-accent" /> Current
               </div>
               <div className="flex items-center gap-2 text-xs font-bold opacity-40">
                 <div className="w-3 h-3 rounded-full border-2 border-slate-400" /> Previous
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-positive/50">
                 <div className="w-3 h-[2px] border-b border-dashed border-positive" /> Target
               </div>
            </div>
          </div>

          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={data?.comparison}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={(val) => `₹${val / 100000}L`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatINR(value), '']}
                />
                <Area type="monotone" dataKey="currentRevenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" />
                <Line type="monotone" dataKey="previousRevenue" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="targetRevenue" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="3 3" opacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>

       {/* Detailed Comparison Table */}
       <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground">Monthly Variance Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Current FY (₹)</th>
                  <th className="px-6 py-4">Previous FY (₹)</th>
                  <th className="px-6 py-4">Prorated Target (₹)</th>
                  <th className="px-6 py-4 text-center">YoY Growth</th>
                  <th className="px-6 py-4 text-right">Target Variance</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {data?.comparison?.map((row: any) => (
                  <tr key={row.month} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{row.month}</td>
                    <td className="px-6 py-4 font-mono">{formatINR(row.currentRevenue)}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{formatINR(row.previousRevenue)}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{formatINR(row.targetRevenue)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black",
                        row.yoyGrowth >= 0 ? "text-positive bg-positive/10" : "text-destructive bg-destructive/10"
                      )}>
                        {row.yoyGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {row.yoyGrowth.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className={cn(
                        "inline-flex items-center gap-1 font-mono font-bold",
                        row.targetVariance >= 0 ? "text-positive" : "text-destructive"
                      )}>
                        {row.targetVariance >= 0 ? '+' : ''}{row.targetVariance.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};

export default YoYComparison;
