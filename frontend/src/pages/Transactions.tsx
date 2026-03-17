import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { formatINRCurrency, FY_MONTHS } from '@/lib/formatINR';
import { usePermission } from '@/lib/permissions';

type Tab = 'income' | 'expense';

const INCOME_CATEGORIES = ['Operating', 'Non-Operating', 'Other'] as const;
const EXPENSE_CATEGORIES = ['COGS', 'Opex', 'Capex', 'Finance', 'Tax', 'Other'] as const;

type Txn = {
  _id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  month: string;
  financialYear: string;
  branch?: string;
  costCentre?: string;
  vendor?: string;
  gstRate?: number;
  gstAmount?: number;
};

const Transactions: React.FC = () => {
  const { financialYear } = useAppStore();
  const canWrite = usePermission('write');
  const canDelete = usePermission('delete');
  const [tab, setTab] = useState<Tab>('income');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Txn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: tab === 'income' ? 'Operating' : 'Opex',
    description: '',
    amount: '',
    month: 'Apr',
    branch: '',
    costCentre: '',
    vendor: '',
    gstApplicable: true,
    gstInput: true,
    gstRate: 18,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, category: tab === 'income' ? 'Operating' : 'Opex' }));
  }, [tab]);

  const listEndpoint = useMemo(() => (tab === 'income' ? '/transactions/income' : '/transactions/expense'), [tab]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get(listEndpoint, { params: { financialYear, limit: 50 } });
      setItems(resp.data?.transactions || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, financialYear]);

  const create = async () => {
    setError(null);
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid description and amount.');
      return;
    }
    try {
      if (tab === 'income') {
        await api.post('/transactions/income', {
          date: form.date,
          category: form.category,
          description: form.description,
          amount,
          gstApplicable: form.gstApplicable,
          gstRate: form.gstRate,
          financialYear,
          month: form.month,
          branch: form.branch || undefined,
          costCentre: form.costCentre || undefined,
        });
      } else {
        await api.post('/transactions/expense', {
          date: form.date,
          category: form.category,
          description: form.description,
          amount,
          gstInput: form.gstInput,
          gstRate: form.gstRate,
          vendor: form.vendor || undefined,
          financialYear,
          month: form.month,
          branch: form.branch || undefined,
          costCentre: form.costCentre || undefined,
        });
      }
      setForm((f) => ({ ...f, description: '', amount: '' }));
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create transaction');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`${listEndpoint}/${id}`);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const exportCsv = () => {
    if (!items.length) return;
    const headers = tab === 'income'
      ? ['Date', 'Month', 'Category', 'Description', 'Amount', 'GST Rate', 'GST Amount', 'Branch', 'Cost Centre']
      : ['Date', 'Month', 'Category', 'Description', 'Amount', 'GST Rate', 'GST Amount', 'Vendor', 'Branch', 'Cost Centre'];
    const rows = items.map((t) =>
      tab === 'income'
        ? [t.date.slice(0, 10), t.month, t.category, `"${t.description}"`, t.amount, t.gstRate ?? 0, t.gstAmount ?? 0, t.branch ?? '', t.costCentre ?? '']
        : [t.date.slice(0, 10), t.month, t.category, `"${t.description}"`, t.amount, t.gstRate ?? 0, t.gstAmount ?? 0, t.vendor ?? '', t.branch ?? '', t.costCentre ?? '']
    );
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}-transactions-${financialYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Transactions</h2>
          <p className="text-muted-foreground text-sm font-medium">Add and manage income/expense entries for FY {financialYear}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('income')}
            className={`px-4 py-2 rounded-xl text-sm font-black ${tab === 'income' ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}
          >
            Income
          </button>
          <button
            onClick={() => setTab('expense')}
            className={`px-4 py-2 rounded-xl text-sm font-black ${tab === 'expense' ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}
          >
            Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-card border p-6 rounded-2xl shadow-sm space-y-4">
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add entry</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              >
                {FY_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
            >
              {(tab === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              placeholder={tab === 'income' ? 'Consulting fee' : 'Office rent'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</label>
              <input
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
                placeholder="100000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GST %</label>
              <input
                value={String(form.gstRate)}
                onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
                placeholder="18"
              />
            </div>
          </div>

          {tab === 'expense' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendor (optional)</label>
              <input
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Branch</label>
              <input
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cost centre</label>
              <input
                value={form.costCentre}
                onChange={(e) => setForm((f) => ({ ...f, costCentre: e.target.value }))}
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none"
              />
            </div>
          </div>

          <Button onClick={create} className="w-full gap-2" disabled={!canWrite}>
            <Plus className="w-4 h-4" />
            Add {tab === 'income' ? 'Income' : 'Expense'}
          </Button>
        </div>

        <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
            <div>
              <div className="text-sm font-heading font-black tracking-tight">{tab === 'income' ? 'Income' : 'Expense'} entries</div>
              <div className="text-xs text-muted-foreground font-medium">Latest 50</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!items.length} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button variant="outline" onClick={load} disabled={loading}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {loading ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={5}>
                      No entries yet.
                    </td>
                  </tr>
                ) : (
                  items.map((t) => (
                    <tr key={t._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4">{t.category}</td>
                      <td className="px-6 py-4">{t.description}</td>
                      <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(t.amount)}</td>
                      <td className="px-6 py-4 text-right">
                        {canDelete && (
                          <button
                            className="inline-flex items-center gap-2 text-xs font-black text-destructive hover:underline"
                            onClick={() => remove(t._id)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;

