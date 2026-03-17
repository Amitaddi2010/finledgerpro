import React, { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { formatINRCurrency } from '@/lib/formatINR';
import { usePermission } from '@/lib/permissions';

type BankEntry = {
  _id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  matchedTransactionId?: string;
};

type Statement = {
  _id: string;
  accountName: string;
  statementDate: string;
  entries: BankEntry[];
};

const BankReconciliation: React.FC = () => {
  const { financialYear } = useAppStore();
  const canWrite = usePermission('write');
  const fileRef = useRef<HTMLInputElement>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [activeStatement, setActiveStatement] = useState<Statement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [matchingEntry, setMatchingEntry] = useState<BankEntry | null>(null);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnResults, setTxnResults] = useState<any[]>([]);
  const [matchSaving, setMatchSaving] = useState(false);

  const loadStatements = async (selectId?: string, fy?: string) => {
    const useFY = fy ?? financialYear;
    try {
      const r = await api.get('/bank-reco/statements', { params: { financialYear: useFY } });
      const list: Statement[] = r.data.statements || [];
      setStatements(list);
      const targetId = selectId || list[0]?._id;
      if (targetId) {
        const fresh = await api.get(`/bank-reco/statements/${targetId}`);
        setActiveStatement(fresh.data.statement);
      } else {
        setActiveStatement(null);
      }
    } catch {
      setStatements([]);
      setActiveStatement(null);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStatements(undefined, financialYear); }, [financialYear]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('financialYear', financialYear);
      const r = await api.post('/bank-reco/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadStatements(r.data.statementId);
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const searchTxns = async (q: string) => {
    setTxnSearch(q);
    if (q.length < 2) { setTxnResults([]); return; }
    try {
      const [inc, exp] = await Promise.all([
        api.get('/transactions/income', { params: { financialYear, limit: 10 } }),
        api.get('/transactions/expense', { params: { financialYear, limit: 10 } }),
      ]);
      const all = [
        ...(inc.data.transactions || []).map((t: any) => ({ ...t, _type: 'income' })),
        ...(exp.data.transactions || []).map((t: any) => ({ ...t, _type: 'expense' })),
      ].filter(t => t.description?.toLowerCase().includes(q.toLowerCase()));
      setTxnResults(all.slice(0, 10));
    } catch {
      setTxnResults([]);
    }
  };

  const matchEntry = async (txnId: string) => {
    if (!matchingEntry || !activeStatement) return;
    setMatchSaving(true);
    try {
      await api.post('/bank-reco/match', {
        statementId: activeStatement._id,
        entryId: matchingEntry._id,
        transactionId: txnId,
      });
      await loadStatements(activeStatement._id);
      setMatchingEntry(null);
      setTxnSearch('');
      setTxnResults([]);
    } catch (e: any) {
      setUploadError(e.response?.data?.error || 'Match failed');
    } finally {
      setMatchSaving(false);
    }
  };

  const unmatch = async (entry: BankEntry) => {
    if (!activeStatement) return;
    try {
      await api.post('/bank-reco/unmatch', { statementId: activeStatement._id, entryId: entry._id });
      await loadStatements(activeStatement._id);
    } catch (e: any) {
      setUploadError(e.response?.data?.error || 'Unmatch failed');
    }
  };

  const exportCsv = () => {
    if (!activeStatement) return;
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = activeStatement.entries.map(e => [
      e.date.slice(0, 10), `"${e.description}"`, e.debit, e.credit, e.balance,
      e.matchedTransactionId ? 'Matched' : 'Unmatched',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bank-reco-${financialYear}.csv`;
    a.click();
  };

  const entries = activeStatement?.entries || [];
  const matched = entries.filter(e => e.matchedTransactionId).length;
  const unmatched = entries.length - matched;

  return (
    <div className="space-y-6">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Bank Reconciliation</h2>
          <p className="text-muted-foreground text-sm font-medium">FY {financialYear} — CSV import</p>
        </div>
        <div className="flex gap-2">
          {activeStatement && (
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          )}
          {canWrite && (
            <>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Import CSV'}
              </Button>
            </>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{uploadError}</div>
      )}

      {/* Statement selector */}
      {statements.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {statements.map(s => (
            <button
              key={s._id}
              onClick={async () => {
                const fresh = await api.get(`/bank-reco/statements/${s._id}`);
                setActiveStatement(fresh.data.statement);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                activeStatement?._id === s._id ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.accountName} — {s.statementDate.slice(0, 10)}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {activeStatement && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border p-5 rounded-2xl shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Entries</div>
            <div className="text-3xl font-black">{entries.length}</div>
          </div>
          <div className="bg-card border p-5 rounded-2xl shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Matched</div>
            <div className="text-3xl font-black text-positive">{matched}</div>
          </div>
          <div className="bg-card border p-5 rounded-2xl shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Unmatched</div>
            <div className="text-3xl font-black text-warning">{unmatched}</div>
          </div>
        </div>
      )}

      {/* Entries table */}
      {!activeStatement ? (
        <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
          <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Import a bank statement CSV to get started.</p>
          <p className="text-xs mt-1">Expected columns: date, description, debit, credit, balance</p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Debit</th>
                  <th className="px-6 py-4 text-right">Credit</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  {canWrite && <th className="px-6 py-4" />}
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {entries.map(entry => (
                  <tr key={entry._id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{entry.date.slice(0, 10)}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{entry.description}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-destructive">
                      {entry.debit > 0 ? formatINRCurrency(entry.debit) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-positive">
                      {entry.credit > 0 ? formatINRCurrency(entry.credit) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{formatINRCurrency(entry.balance)}</td>
                    <td className="px-6 py-4 text-center">
                      {entry.matchedTransactionId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-positive/10 text-positive">
                          <CheckCircle2 className="w-3 h-3" /> Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-warning/10 text-warning">
                          <AlertTriangle className="w-3 h-3" /> Unmatched
                        </span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 text-right">
                        {entry.matchedTransactionId ? (
                          <button onClick={() => unmatch(entry)} className="text-xs font-black text-muted-foreground hover:text-destructive">
                            Unmatch
                          </button>
                        ) : (
                          <button onClick={() => setMatchingEntry(entry)} className="text-xs font-black text-accent hover:underline">
                            Match
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Match modal */}
      {matchingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Match Transaction</h3>
              <button onClick={() => { setMatchingEntry(null); setTxnSearch(''); setTxnResults([]); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
                <div className="font-bold">{matchingEntry.description}</div>
                <div className="font-mono text-xs text-muted-foreground">{matchingEntry.date.slice(0, 10)}</div>
                <div className="font-mono text-xs">
                  {matchingEntry.debit > 0 ? `Debit: ${formatINRCurrency(matchingEntry.debit)}` : `Credit: ${formatINRCurrency(matchingEntry.credit)}`}
                </div>
              </div>
              <input
                className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm"
                placeholder="Search transactions by description…"
                value={txnSearch}
                onChange={e => searchTxns(e.target.value)}
              />
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {txnResults.length === 0 && txnSearch.length >= 2 && (
                  <p className="text-sm text-muted-foreground">No matching transactions found.</p>
                )}
                {txnResults.map(t => (
                  <button
                    key={t._id}
                    onClick={() => matchEntry(t._id)}
                    disabled={matchSaving}
                    className="w-full text-left p-3 rounded-xl border hover:bg-accent/10 hover:border-accent transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold">{t.description}</div>
                        <div className="text-xs text-muted-foreground font-mono">{t.date?.slice(0, 10)} · {t._type} · {t.category}</div>
                      </div>
                      <div className="font-mono text-sm font-bold">{formatINRCurrency(t.amount)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;
