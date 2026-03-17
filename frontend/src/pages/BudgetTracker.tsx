import React, { useState, useEffect } from 'react';
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  X
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
import { formatINRCurrency, toLakhsCrores } from '@/lib/formatINR';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BudgetRecommendations from '@/components/BudgetRecommendations';
import { usePermission } from '@/lib/permissions';

const EXPENSE_CATEGORIES = ['COGS', 'Opex', 'Capex', 'Finance', 'Tax', 'Other'];

const BudgetTracker: React.FC = () => {
  const { financialYear } = useAppStore();
  const canWrite = usePermission('write');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ category: 'Opex', annualBudget: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    const fetchBudgets = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/budgets/utilisation?financialYear=${financialYear}`);
        setData(response.data);
      } catch (err) {
        console.error("Budget fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, [financialYear]);

  if (loading) return <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-2xl dark:bg-slate-800" />)}
    </div>
    <div className="h-96 bg-slate-200 rounded-2xl dark:bg-slate-800" />
  </div>;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Annual Budget</div>
           <div className="text-3xl font-mono font-black tracking-tighter mb-4">{toLakhsCrores(data?.overallTotals?.totalBudget || 0)}</div>
           <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
             <Target className="w-4 h-4" /> Across {data?.utilisations?.length || 0} Categories
           </div>
        </div>
        
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Utilised YTD</div>
           <div className="text-3xl font-mono font-black tracking-tighter mb-4 text-accent">{toLakhsCrores(data?.overallTotals?.totalUtilised || 0)}</div>
           <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent" 
                  style={{ width: `${data?.overallTotals?.totalBudget > 0 ? Math.min((data.overallTotals.totalUtilised / data.overallTotals.totalBudget) * 100, 100) : 0}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span>{data?.overallTotals?.totalBudget > 0 ? ((data.overallTotals.totalUtilised / data.overallTotals.totalBudget) * 100).toFixed(1) : '0.0'}% Spent</span>
                <span className="text-muted-foreground">Budget: {toLakhsCrores(data?.overallTotals?.totalBudget)}</span>
              </div>
           </div>
        </div>

        <div className="bg-card border p-6 rounded-2xl shadow-sm">
           <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Projected Year-End Variance</div>
           <div className={cn(
             "text-3xl font-mono font-black tracking-tighter mb-4",
             data?.overallTotals?.overallVariance >= 0 ? "text-positive" : "text-destructive"
           )}>
             {data?.overallTotals?.overallVariance >= 0 ? '+' : ''}{toLakhsCrores(data?.overallTotals?.overallVariance || 0)}
           </div>
           <div className="flex items-center gap-2 text-xs font-bold">
             {data?.overallTotals?.overallVariance >= 0 ? (
               <CheckCircle2 className="w-4 h-4 text-positive" />
             ) : (
               <AlertTriangle className="w-4 h-4 text-warning" />
             )}
             <span className={data?.overallTotals?.overallVariance >= 0 ? "text-positive" : "text-warning"}>
               {data?.overallTotals?.overallVariance >= 0 ? 'Within Budget' : 'Burn Rate High'}
             </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown & Charts (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-muted/30 flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground">Category Utilisation</h3>
              {canWrite && (
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-[10px] font-black uppercase" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-3 h-3" /> Add Budget
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                     <th className="px-6 py-4">Category</th>
                     <th className="px-6 py-4">Budgeted</th>
                     <th className="px-6 py-4">Actuals</th>
                     <th className="px-6 py-4 text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm font-medium">
                   {data?.utilisations?.map((u: any) => (
                     <tr key={u.category} className="border-b hover:bg-muted/30 transition-colors">
                       <td className="px-6 py-5">
                         <div className="font-bold mb-1">{u.category}</div>
                         <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                           <div 
                             className={cn("h-full", u.percUsed > 100 ? "bg-destructive" : u.percUsed > 85 ? "bg-warning" : "bg-positive")} 
                             style={{ width: `${Math.min(u.percUsed, 100)}%` }} 
                           />
                         </div>
                       </td>
                       <td className="px-6 py-5">
                         <div className="font-mono text-[11px]">{formatINRCurrency(u.budgeted)}</div>
                         <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Annual</div>
                       </td>
                       <td className="px-6 py-5">
                         <div className="font-mono text-[11px] font-bold">{formatINRCurrency(u.actuals)}</div>
                         <div className="text-[10px] text-accent font-bold uppercase tracking-tighter">{u.percUsed.toFixed(1)}% Used</div>
                       </td>
                       <td className="px-6 py-5 text-right">
                         <div className={cn(
                           "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                           u.percUsed > 100 ? "bg-destructive/10 text-destructive" : u.percUsed > 85 ? "bg-warning/10 text-warning" : "bg-positive/10 text-positive"
                         )}>
                           {u.percUsed > 100 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                           {u.percUsed > 100 ? 'Over' : 'On Track'}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-col">
            <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-muted-foreground mb-8">Utilisation Density</h3>
            <div className="flex-1 min-h-[400px]">
               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                 <BarChart data={data?.utilisations} margin={{ top: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/100000}L`} />
                   <Tooltip formatter={(v: any) => formatINRCurrency(v)} cursor={{ fill: '#f8fafc' }} />
                   <Bar dataKey="budgeted" name="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={32} />
                   <Bar dataKey="actuals" name="Actuals" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32}>
                      {data?.utilisations?.map((u: any, index: number) => (
                        <Cell key={index} fill={u.percUsed > 100 ? '#f43f5e' : u.percUsed > 85 ? '#f59e0b' : '#3b82f6'} />
                      ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Recommendations (Right 1/3) */}
        <div className="lg:col-span-1">
           <BudgetRecommendations financialYear={financialYear} />
        </div>
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Add Budget</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {addError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{addError}</div>}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                <select
                  className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm"
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Annual Budget (₹)</label>
                <input
                  type="number"
                  className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm"
                  placeholder="1000000"
                  value={addForm.annualBudget}
                  onChange={e => setAddForm(f => ({ ...f, annualBudget: e.target.value }))}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button
                disabled={addSaving}
                onClick={async () => {
                  setAddError(null);
                  const amount = parseFloat(addForm.annualBudget);
                  if (!Number.isFinite(amount) || amount <= 0) { setAddError('Enter a valid amount'); return; }
                  setAddSaving(true);
                  try {
                    await api.post('/budgets', { category: addForm.category, annualBudget: amount, financialYear, status: 'draft' });
                    setShowAddModal(false);
                    setAddForm({ category: 'Opex', annualBudget: '' });
                    const response = await api.get(`/budgets/utilisation?financialYear=${financialYear}`);
                    setData(response.data);
                  } catch (e: any) {
                    setAddError(e.response?.data?.error || 'Failed to save budget');
                  } finally {
                    setAddSaving(false);
                  }
                }}
              >
                {addSaving ? 'Saving…' : 'Save Budget'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;
