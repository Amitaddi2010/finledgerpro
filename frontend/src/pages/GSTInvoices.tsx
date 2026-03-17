import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { formatINRCurrency, FY_MONTHS } from '@/lib/formatINR';
import { usePermission } from '@/lib/permissions';

type InvoiceType = 'B2B' | 'B2C' | 'export';

type LineItem = { description: string; amount: number; gstRate: number };

type Invoice = {
  _id: string;
  invoiceNo: string;
  date: string;
  partyName: string;
  partyGSTIN?: string;
  type: InvoiceType;
  lineItems: LineItem[];
  totalTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  financialYear: string;
  month: string;
};

const emptyForm = () => ({
  invoiceNo: '',
  date: new Date().toISOString().slice(0, 10),
  partyName: '',
  partyGSTIN: '',
  type: 'B2B' as InvoiceType,
  month: 'Apr',
  lineItems: [{ description: '', amount: '', gstRate: '18' }] as any[],
});

const GSTInvoices: React.FC = () => {
  const { financialYear } = useAppStore();
  const canWrite = usePermission('write');
  const canDelete = usePermission('delete');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/invoices', { params: { financialYear } });
      setInvoices(r.data.invoices || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [financialYear]);

  const setLineItem = (i: number, field: string, value: string) => {
    setForm(f => {
      const items = [...f.lineItems];
      items[i] = { ...items[i], [field]: value };
      return { ...f, lineItems: items };
    });
  };

  const addLine = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', amount: '', gstRate: '18' }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_: any, idx: number) => idx !== i) }));

  const save = async () => {
    setError(null);
    if (!form.invoiceNo.trim()) { setError('Invoice number is required'); return; }
    if (!form.partyName.trim()) { setError('Party name is required'); return; }
    const items = form.lineItems.map((l: any) => ({
      description: l.description,
      amount: parseFloat(l.amount) || 0,
      gstRate: parseFloat(l.gstRate) || 0,
    }));
    if (items.some((l: any) => !l.description.trim() || l.amount <= 0)) {
      setError('All line items need a description and a positive amount'); return;
    }
    setSaving(true);
    try {
      await api.post('/invoices', { ...form, lineItems: items, financialYear });
      setShowModal(false);
      setForm(emptyForm());
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(prev => prev.filter(x => x._id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const exportCsv = () => {
    const headers = ['Invoice No', 'Date', 'Month', 'Party', 'GSTIN', 'Type', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'];
    const rows = invoices.map(inv => [
      inv.invoiceNo, inv.date.slice(0, 10), inv.month, `"${inv.partyName}"`,
      inv.partyGSTIN || '', inv.type,
      inv.totalTaxable, inv.cgst, inv.sgst, inv.igst, inv.total,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `gst-invoices-${financialYear}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">GST Invoices</h2>
          <p className="text-muted-foreground text-sm font-medium">FY {financialYear}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!invoices.length} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          {canWrite && (
            <Button size="sm" onClick={() => { setError(null); setForm(emptyForm()); setShowModal(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                <th className="px-6 py-4">Invoice No</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Taxable</th>
                <th className="px-6 py-4 text-right">GST</th>
                <th className="px-6 py-4 text-right">Total</th>
                {canDelete && <th className="px-6 py-4" />}
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-muted-foreground">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-muted-foreground">No invoices yet. Create one to get started.</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv._id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold">{inv.invoiceNo}</td>
                  <td className="px-6 py-4 font-mono text-xs">{inv.date.slice(0, 10)}</td>
                  <td className="px-6 py-4">
                    <div>{inv.partyName}</div>
                    {inv.partyGSTIN && <div className="text-[10px] text-muted-foreground font-mono">{inv.partyGSTIN}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-accent/10 text-accent">{inv.type}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(inv.totalTaxable)}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(inv.cgst + inv.sgst + inv.igst)}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-bold">{formatINRCurrency(inv.total)}</td>
                  {canDelete && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => remove(inv._id)} className="text-destructive hover:underline text-xs font-black inline-flex items-center gap-1">
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

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">New GST Invoice</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Invoice No">
                  <input className={inp} value={form.invoiceNo} onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))} placeholder="INV-001" />
                </Field>
                <Field label="Date">
                  <input type="date" className={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </Field>
                <Field label="Party Name">
                  <input className={inp} value={form.partyName} onChange={e => setForm(f => ({ ...f, partyName: e.target.value }))} placeholder="ABC Pvt Ltd" />
                </Field>
                <Field label="Party GSTIN (optional)">
                  <input className={inp} value={form.partyGSTIN} onChange={e => setForm(f => ({ ...f, partyGSTIN: e.target.value }))} placeholder="27AABCU9603R1ZX" />
                </Field>
                <Field label="Type">
                  <select className={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as InvoiceType }))}>
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="export">Export</option>
                  </select>
                </Field>
                <Field label="Month">
                  <select className={inp} value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                    {FY_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Line Items</div>
                {form.lineItems.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_100px_32px] gap-2 items-center">
                    <input className={inp} placeholder="Description" value={item.description} onChange={e => setLineItem(i, 'description', e.target.value)} />
                    <input className={inp} placeholder="Amount" value={item.amount} onChange={e => setLineItem(i, 'amount', e.target.value)} />
                    <select className={inp} value={item.gstRate} onChange={e => setLineItem(i, 'gstRate', e.target.value)}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                    {form.lineItems.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-destructive"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
                <button onClick={addLine} className="text-xs font-black text-accent hover:underline">+ Add line</button>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Invoice'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inp = 'w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none focus:ring-2 focus:ring-accent/30 text-sm';

export default GSTInvoices;
