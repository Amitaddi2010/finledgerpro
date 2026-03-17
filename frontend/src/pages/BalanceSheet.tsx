import React, { useEffect, useRef, useState } from 'react';
import { Plus, Upload, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { formatINRCurrency, FY_MONTHS } from '@/lib/formatINR';
import { usePermission } from '@/lib/permissions';

type BSEntry = {
  _id: string;
  financialYear: string;
  month: string;
  date: string;
  totalAssets: number;
  currentAssets: number;
  cashAndEquivalents: number;
  inventory: number;
  receivables: number;
  nonCurrentAssets: number;
  totalLiabilities: number;
  currentLiabilities: number;
  payables: number;
  nonCurrentLiabilities: number;
  totalDebt: number;
  shareholdersEquity: number;
  retainedEarnings: number;
  netRevenue: number;
  netProfit: number;
};

const emptyForm = (financialYear: string) => ({
  financialYear,
  month: 'Mar',
  date: new Date().toISOString().slice(0, 10),
  totalAssets: '', currentAssets: '', cashAndEquivalents: '', inventory: '', receivables: '', nonCurrentAssets: '',
  totalLiabilities: '', currentLiabilities: '', payables: '', nonCurrentLiabilities: '', totalDebt: '',
  shareholdersEquity: '', retainedEarnings: '',
  netRevenue: '', netProfit: '',
  capitalEmployed: '', ebit: '', interestExpense: '', depreciation: '', ebitda: '',
  operatingExpenses: '', grossProfit: '', cogs: '', netCreditSales: '', netCreditPurchases: '',
});

const FIELDS: { key: string; label: string }[] = [
  { key: 'totalAssets', label: 'Total Assets' },
  { key: 'currentAssets', label: 'Current Assets' },
  { key: 'cashAndEquivalents', label: 'Cash & Equivalents' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'nonCurrentAssets', label: 'Non-Current Assets' },
  { key: 'totalLiabilities', label: 'Total Liabilities' },
  { key: 'currentLiabilities', label: 'Current Liabilities' },
  { key: 'payables', label: 'Payables' },
  { key: 'nonCurrentLiabilities', label: 'Non-Current Liabilities' },
  { key: 'totalDebt', label: 'Total Debt' },
  { key: 'shareholdersEquity', label: "Shareholders' Equity" },
  { key: 'retainedEarnings', label: 'Retained Earnings' },
  { key: 'netRevenue', label: 'Net Revenue' },
  { key: 'cogs', label: 'COGS' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'operatingExpenses', label: 'Operating Expenses' },
  { key: 'ebit', label: 'EBIT' },
  { key: 'interestExpense', label: 'Interest Expense' },
  { key: 'depreciation', label: 'Depreciation' },
  { key: 'ebitda', label: 'EBITDA' },
  { key: 'netProfit', label: 'Net Profit' },
  { key: 'capitalEmployed', label: 'Capital Employed' },
  { key: 'netCreditSales', label: 'Net Credit Sales' },
  { key: 'netCreditPurchases', label: 'Net Credit Purchases' },
];

const BalanceSheet: React.FC = () => {
  const { financialYear } = useAppStore();
  const canWrite = usePermission('write');
  const canDelete = usePermission('delete');
  const fileRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<BSEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(emptyForm(financialYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/balance-sheet', { params: { financialYear } });
      setEntries(r.data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); setForm(emptyForm(financialYear)); }, [financialYear]);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: any = { ...form };
      FIELDS.forEach(f => { payload[f.key] = parseFloat(payload[f.key]) || 0; });
      await api.post('/balance-sheet', payload);
      setShowModal(false);
      setForm(emptyForm(financialYear));
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/balance-sheet/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('financialYear', financialYear);
      await api.post('/import/balance-sheet', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Balance Sheet</h2>
          <p className="text-muted-foreground text-sm font-medium">FY {financialYear} — monthly entries power Financial Ratios</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
              <Upload className="w-4 h-4" /> {uploading ? 'Importing…' : 'Import CSV'}
            </Button>
            <Button size="sm" onClick={() => setShowModal(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                <th className="px-6 py-4">Month</th>
                <th className="px-6 py-4 text-right">Total Assets</th>
                <th className="px-6 py-4 text-right">Total Liabilities</th>
                <th className="px-6 py-4 text-right">Equity</th>
                <th className="px-6 py-4 text-right">Net Revenue</th>
                <th className="px-6 py-4 text-right">Net Profit</th>
                {canDelete && <th className="px-6 py-4" />}
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-muted-foreground">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                    No entries yet. Add a monthly entry or import a CSV.<br />
                    <span className="text-xs">CSV columns: month, financialYear, totalAssets, currentAssets, cashAndEquivalents, inventory, receivables, nonCurrentAssets, totalLiabilities, currentLiabilities, payables, nonCurrentLiabilities, totalDebt, shareholdersEquity, retainedEarnings, netRevenue, cogs, grossProfit, operatingExpenses, ebit, interestExpense, depreciation, ebitda, netProfit, capitalEmployed, netCreditSales, netCreditPurchases</span>
                  </td>
                </tr>
              ) : entries.map(e => (
                <tr key={e._id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{e.month} <span className="text-muted-foreground font-normal text-xs">{e.financialYear}</span></td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(e.totalAssets)}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(e.totalLiabilities)}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(e.shareholdersEquity)}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(e.netRevenue)}</td>
                  <td className={`px-6 py-4 text-right font-mono text-xs font-bold ${e.netProfit >= 0 ? 'text-positive' : 'text-destructive'}`}>
                    {formatINRCurrency(e.netProfit)}
                  </td>
                  {canDelete && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => remove(e._id)} className="text-destructive hover:underline text-xs font-black inline-flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Add Balance Sheet Entry</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Month</label>
                  <select className={inp} value={form.month} onChange={e => setForm((f: any) => ({ ...f, month: e.target.value }))}>
                    {FY_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</label>
                  <input type="date" className={inp} value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {FIELDS.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{f.label}</label>
                    <input
                      type="number"
                      className={inp}
                      value={form[f.key]}
                      onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inp = 'w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-accent/30 text-sm';

export default BalanceSheet;
