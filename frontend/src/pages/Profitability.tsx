import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Upload
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { formatINRCurrency, FY_MONTHS } from '@/lib/formatINR';
import { Button } from '@/components/ui/button';
import { ImportCsvPanel } from '@/components/ImportCsvPanel';

const Profitability: React.FC = () => {
  const { financialYear } = useAppStore();
  const [plData, setPlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const fetchPL = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/reports/pl-statement?financialYear=${financialYear}`);
        setPlData(response.data);
      } catch (err) {
        console.error("P&L fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPL();
  }, [financialYear]);

  if (loading) return <div className="space-y-8 animate-pulse">
    <div className="h-20 bg-slate-200 rounded-xl dark:bg-slate-800" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-96 bg-slate-200 rounded-2xl dark:bg-slate-800" />
      <div className="h-96 bg-slate-200 rounded-2xl dark:bg-slate-800" />
    </div>
  </div>;

  const waterfallData = [
    { name: 'Revenue', value: plData?.totals?.revenue || 0 },
    { name: 'COGS', value: -(plData?.totals?.cogs || 0) },
    { name: 'Gross Profit', value: plData?.totals?.grossProfit || 0 },
    { name: 'Opex', value: -(plData?.totals?.opex || 0) },
    { name: 'Net Profit', value: plData?.totals?.netProfit || 0, isTotal: true },
  ];

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Profitability Engine</h2>
          <p className="text-muted-foreground text-sm font-medium">Detailed P&L Statement for FY {financialYear}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-dashed shadow-sm">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
        </div>
      </div>

      <ImportCsvPanel
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={async () => {
          // refresh P&L after import
          try {
            const response = await api.get(`/reports/pl-statement?financialYear=${financialYear}`);
            setPlData(response.data);
          } catch {
            // ignore
          }
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Waterfall analysis */}
        <div className="lg:col-span-1 bg-card border p-6 rounded-2xl shadow-sm">
          <h3 className="font-heading font-bold mb-6 text-sm uppercase tracking-widest text-muted-foreground">Margin Breakdown</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={waterfallData} layout="vertical" margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatINRCurrency(Math.abs(value)), '']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {waterfallData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isTotal ? '#3b82f6' : entry.value > 0 ? '#10b981' : '#f43f5e'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 pt-6 border-t border-dashed space-y-3">
             <div className="flex justify-between items-center text-sm">
               <span className="text-muted-foreground font-medium">Gross Margin (%)</span>
               <span className="font-mono font-black text-positive">
                 {((plData?.totals?.grossProfit / plData?.totals?.revenue) * 100).toFixed(1)}%
                </span>
             </div>
             <div className="flex justify-between items-center text-sm">
               <span className="text-muted-foreground font-medium">Net Margin (%)</span>
               <span className="font-mono font-black text-accent">
                 {((plData?.totals?.netProfit / plData?.totals?.revenue) * 100).toFixed(1)}%
                </span>
             </div>
          </div>
        </div>

        {/* P&L Table */}
        <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b bg-muted/30">
            <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground">Statement of Profit & Loss</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                  <th className="px-6 py-4">Particuars</th>
                  {FY_MONTHS.map(m => <th key={m} className="px-3 py-4 text-center">{m}</th>)}
                  <th className="px-6 py-4 text-right bg-primary/5 text-primary">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {/* Revenue Row */}
                <tr className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold">Total Revenue (A)</td>
                  {FY_MONTHS.map(m => (
                    <td key={m} className="px-3 py-4 text-center font-mono text-[11px]">
                      {formatINR(plData?.monthly?.[m]?.revenue || 0)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right font-mono font-bold bg-primary/5 text-primary">
                    {formatINR(plData?.totals?.revenue || 0)}
                  </td>
                </tr>
                {/* COGS Row */}
                <tr className="border-b hover:bg-muted/30 transition-colors text-muted-foreground">
                  <td className="px-6 py-4 pl-10 font-medium">Less: COGS</td>
                  {FY_MONTHS.map(m => (
                    <td key={m} className="px-3 py-4 text-center font-mono text-[11px]">
                      ({formatINR(plData?.monthly?.[m]?.cogs || 0)})
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right font-mono font-bold bg-destructive/5 text-destructive">
                    ({formatINR(plData?.totals?.cogs || 0)})
                  </td>
                </tr>
                {/* Gross Profit Row */}
                <tr className="border-b bg-positive/5 hover:bg-positive/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-positive">Gross Profit (B)</td>
                  {FY_MONTHS.map(m => (
                    <td key={m} className="px-3 py-4 text-center font-mono font-bold text-[11px] text-positive">
                      {formatINR(plData?.monthly?.[m]?.grossProfit || 0)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right font-mono font-black text-positive">
                    {formatINR(plData?.totals?.grossProfit || 0)}
                  </td>
                </tr>
                {/* Expenses Row */}
                <tr className="border-b hover:bg-muted/30 transition-colors text-muted-foreground">
                  <td className="px-6 py-4 font-bold">Operating Expenses (C)</td>
                  {FY_MONTHS.map(m => (
                    <td key={m} className="px-3 py-4 text-center font-mono text-[11px]">
                      {formatINR(plData?.monthly?.[m]?.opex || 0)}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right font-mono font-bold bg-destructive/5 text-destructive">
                    {formatINR(plData?.totals?.opex || 0)}
                  </td>
                </tr>
                {/* Net Profit Row */}
                <tr className="bg-primary text-primary-foreground font-black">
                  <td className="px-6 py-5 rounded-bl-xl uppercase tracking-wider font-heading">Net Profit (A-B-C)</td>
                  {FY_MONTHS.map(m => (
                    <td key={m} className="px-3 py-5 text-center font-mono text-[12px]">
                      {formatINR(plData?.monthly?.[m]?.netProfit || 0)}
                    </td>
                  ))}
                  <td className="px-6 py-5 text-right font-mono text-[13px] rounded-br-xl">
                    {formatINR(plData?.totals?.netProfit || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for row formatting
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export default Profitability;
