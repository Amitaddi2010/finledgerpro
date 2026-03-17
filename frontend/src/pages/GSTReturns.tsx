import React, { useEffect, useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { formatINRCurrency, FY_MONTHS } from '@/lib/formatINR';

type Tab = 'gstr1' | 'gstr3b';

const GSTReturns: React.FC = () => {
  const { financialYear } = useAppStore();
  const [tab, setTab] = useState<Tab>('gstr1');
  const [month, setMonth] = useState(FY_MONTHS[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = tab === 'gstr1' ? '/gst/gstr1-summary' : '/gst/gstr3b-summary';
      
      // The return filed in month M corresponds to invoices from month M-1.
      // E.g. GST return filed in April covers March invoices.
      const monthIndex = FY_MONTHS.indexOf(month);
      let targetMonth = month;
      let targetFY = financialYear;

      if (monthIndex === 0) {
        // Return month is 'Apr'. Invoice month is 'Mar' of the previous financial year.
        targetMonth = 'Mar';
        const startYear = parseInt(financialYear.split('-')[0]);
        targetFY = `${startYear - 1}-${startYear.toString().slice(-2)}`;
      } else {
        targetMonth = FY_MONTHS[monthIndex - 1];
        targetFY = financialYear;
      }

      const r = await api.get(endpoint, { params: { financialYear: targetFY, month: targetMonth } });
      setData(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load GST data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, month, financialYear]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    let rows: string[][] = [];
    let headers: string[] = [];

    if (tab === 'gstr1') {
      headers = ['Type', 'Count', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total Tax'];
      const buckets = data.buckets || [];
      rows = buckets.map((b: any) => [b.type, b.count, b.taxable, b.cgst, b.sgst, b.igst, b.totalTax]);
    } else {
      headers = ['Section', 'Amount'];
      rows = [
        ['Output Tax (from invoices)', data.outputTax ?? 0],
        ['Input Tax Credit (from expenses)', data.inputTaxCredit ?? 0],
        ['Net GST Payable', data.netPayable ?? 0],
      ];
    }

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${tab}-${month}-${financialYear}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">GST Returns</h2>
          <p className="text-muted-foreground text-sm font-medium">FY {financialYear}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm font-medium"
          >
            {FY_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['gstr1', 'gstr3b'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-colors ${
              tab === t ? 'bg-accent text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t === 'gstr1' ? 'GSTR-1' : 'GSTR-3B'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="h-48 bg-muted animate-pulse rounded-2xl" />
      ) : !data ? null : tab === 'gstr1' ? (
        <GSTR1View data={data} />
      ) : (
        <GSTR3BView data={data} />
      )}
    </div>
  );
};

const GSTR1View: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total Invoices', value: data.totalInvoices ?? 0, mono: false },
        { label: 'Total Taxable', value: formatINRCurrency(data.totalTaxable ?? 0), mono: true },
        { label: 'Total GST', value: formatINRCurrency(data.totalGST ?? 0), mono: true },
        { label: 'Total Invoice Value', value: formatINRCurrency(data.totalValue ?? 0), mono: true },
      ].map(s => (
        <div key={s.label} className="bg-card border p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
          <div className={`text-2xl font-black tracking-tighter ${s.mono ? 'font-mono' : ''}`}>{s.value}</div>
        </div>
      ))}
    </div>

    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b bg-muted/30">
        <div className="text-sm font-black uppercase tracking-widest text-muted-foreground">Breakup by Invoice Type</div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4 text-right">Count</th>
            <th className="px-6 py-4 text-right">Taxable</th>
            <th className="px-6 py-4 text-right">CGST</th>
            <th className="px-6 py-4 text-right">SGST</th>
            <th className="px-6 py-4 text-right">IGST</th>
            <th className="px-6 py-4 text-right">Total Tax</th>
          </tr>
        </thead>
        <tbody className="text-sm font-medium">
          {(data.buckets || []).length === 0 ? (
            <tr><td colSpan={7} className="px-6 py-8 text-muted-foreground">No invoices for this period.</td></tr>
          ) : (data.buckets || []).map((b: any) => (
            <tr key={b.type} className="border-b hover:bg-muted/30">
              <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-accent/10 text-accent">{b.type}</span></td>
              <td className="px-6 py-4 text-right font-mono">{b.count}</td>
              <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(b.taxable)}</td>
              <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(b.cgst)}</td>
              <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(b.sgst)}</td>
              <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(b.igst)}</td>
              <td className="px-6 py-4 text-right font-mono font-bold">{formatINRCurrency(b.totalTax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const GSTR3BView: React.FC<{ data: any }> = ({ data }) => {
  const netPayable = (data.netPayable ?? 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: 'Output Tax (Sales)', value: data.outputTax ?? 0, color: 'text-destructive' },
        { label: 'Input Tax Credit (Purchases)', value: data.inputTaxCredit ?? 0, color: 'text-positive' },
        { label: 'Net GST Payable', value: netPayable, color: netPayable > 0 ? 'text-warning' : 'text-positive' },
      ].map(s => (
        <div key={s.label} className="bg-card border p-6 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{s.label}</div>
          <div className={`text-3xl font-mono font-black tracking-tighter ${s.color}`}>{formatINRCurrency(s.value)}</div>
        </div>
      ))}
      <div className="md:col-span-3 bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/30">
          <div className="text-sm font-black uppercase tracking-widest text-muted-foreground">GST Rate-wise Breakup</div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
              <th className="px-6 py-4">GST Rate</th>
              <th className="px-6 py-4 text-right">Taxable (Output)</th>
              <th className="px-6 py-4 text-right">Tax (Output)</th>
              <th className="px-6 py-4 text-right">Taxable (Input)</th>
              <th className="px-6 py-4 text-right">ITC</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {(data.rateBreakup || []).length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-muted-foreground">No data for this period.</td></tr>
            ) : (data.rateBreakup || []).map((r: any) => (
              <tr key={r.rate} className="border-b hover:bg-muted/30">
                <td className="px-6 py-4 font-bold">{r.rate}%</td>
                <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(r.outputTaxable)}</td>
                <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(r.outputTax)}</td>
                <td className="px-6 py-4 text-right font-mono">{formatINRCurrency(r.inputTaxable)}</td>
                <td className="px-6 py-4 text-right font-mono font-bold">{formatINRCurrency(r.itc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GSTReturns;
