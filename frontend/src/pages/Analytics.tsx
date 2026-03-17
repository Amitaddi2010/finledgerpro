import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Filter, 
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { formatINRCurrency } from '@/lib/formatINR';
import { Button } from '@/components/ui/button';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const Analytics: React.FC = () => {
  const { financialYear } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>({});

  useEffect(() => {
    const fetchCharts = async () => {
      setLoading(true);
      try {
        const [revenueTrend, expenseBreakdown, marginTrend, topExpenses] = await Promise.all([
          api.get(`/analytics/charts/revenue-expense-trend?financialYear=${financialYear}`),
          api.get(`/analytics/charts/expense-breakdown?financialYear=${financialYear}`),
          api.get(`/analytics/charts/margin-trend?financialYear=${financialYear}`),
          api.get(`/analytics/charts/top-expenses?financialYear=${financialYear}`),
        ]);

        setChartData({
          revenueTrend: revenueTrend.data,
          expenseBreakdown: expenseBreakdown.data,
          marginTrend: marginTrend.data,
          topExpenses: topExpenses.data
        });
      } catch (err) {
        console.error("Charts fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCharts();
  }, [financialYear]);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
    {[1,2,3,4].map(i => <div key={i} className="h-96 bg-slate-200 rounded-2xl dark:bg-slate-800" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-card border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-accent" /> Advanced Analytics
          </h2>
          <p className="text-muted-foreground text-sm font-medium">Visual intelligence and multi-dimensional trends</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Revenue vs Expense Area */}
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-8">Cash Flow Dynamics</h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
               <AreaChart data={chartData.revenueTrend}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/100000}L`} />
                 <Tooltip formatter={(v: any) => formatINRCurrency(v)} />
                 <Legend verticalAlign="top" height={36} iconType="circle" />
                 <Area type="monotone" dataKey="currentRevenue" name="Revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                 <Area type="monotone" dataKey="currentExpense" name="Expenses" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={2} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Chart 2: Margin Trend */}
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-8">Margin Heatmap (%)</h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
               <LineChart data={chartData.marginTrend}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                 <Tooltip />
                 <Legend verticalAlign="top" height={36} iconType="circle" />
                 <Line type="stepAfter" dataKey="grossMargin" name="Gross Margin" stroke="#10b981" strokeWidth={3} dot={false} />
                 <Line type="stepAfter" dataKey="netMargin" name="Net Margin" stroke="#3b82f6" strokeWidth={3} dot={false} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Chart 3: Expense Breakdown Pie */}
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-8">Expense Distribution</h3>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
               <PieChart>
                 <Pie
                   data={chartData.expenseBreakdown}
                   cx="50%"
                   cy="50%"
                   innerRadius={80}
                   outerRadius={120}
                   paddingAngle={5}
                   dataKey="value"
                   nameKey="category"
                   label={(props: any) => {
                     const category = props?.payload?.category ?? '';
                     const percent = (props?.percent ?? 0) as number;
                     return `${category} (${(percent * 100).toFixed(0)}%)`;
                   }}
                 >
                   {chartData.expenseBreakdown?.map((_: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(v: any) => formatINRCurrency(v)} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Chart 4: Top Expenses Bar */}
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-8">Top Expense Drivers</h3>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
               <BarChart data={chartData.topExpenses} layout="vertical" margin={{ left: 40 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                 <Tooltip formatter={(v: any) => formatINRCurrency(v)} />
                 <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
