import { useMemo, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';

type ImportType = 'income' | 'expense';

export function ImportCsvPanel(props: {
  open: boolean;
  onClose: () => void;
  onImported?: (result: { count: number; message: string }) => void;
}) {
  const { open, onClose, onImported } = props;
  const { financialYear, setFinancialYear } = useAppStore();
  const [type, setType] = useState<ImportType>('income');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importedFYs, setImportedFYs] = useState<string[] | null>(null);

  const accept = useMemo(() => '.csv,text/csv', []);

  if (!open) return null;

  const upload = async () => {
    if (!file) {
      setError('Please choose a CSV file.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setImportedFYs(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      const resp = await api.post('/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(resp.data?.message || 'Imported');
      if (Array.isArray(resp.data?.financialYears)) {
        setImportedFYs(resp.data.financialYears);
      }
      onImported?.({ count: resp.data?.count || 0, message: resp.data?.message || 'Imported' });
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-lg font-heading font-black tracking-tight">Import CSV</div>
            <div className="text-xs text-muted-foreground font-medium">
              Upload income/expense entries for the active company.
            </div>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ImportType)}
                className="w-full bg-muted text-sm font-semibold px-3 py-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">CSV File</label>
              <input
                type="file"
                accept={accept}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:text-white file:font-black hover:file:bg-accent/90"
              />
              {file && <div className="text-xs text-muted-foreground truncate">{file.name}</div>}
            </div>
          </div>

          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground space-y-2">
            <div className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Expected columns</div>
            <div className="leading-relaxed">
              <span className="font-semibold">Required</span>: <code className="font-mono">date,category,description,amount,financialYear,month</code>
              <br />
              <span className="font-semibold">Optional</span>: <code className="font-mono">branch,costCentre,vendor,gstApplicable,gstInput,gstRate</code>
            </div>
            <div className="pt-2 text-[11px]">
              Current FY in app: <span className="font-mono font-bold">{financialYear}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">
              {success}
            </div>
          )}
          {importedFYs && importedFYs.length > 0 && !importedFYs.includes(financialYear) && (
            <div className="rounded-xl border px-4 py-3 text-sm">
              Imported FY: <span className="font-mono font-bold">{importedFYs.join(', ')}</span>. Your UI is currently showing FY{' '}
              <span className="font-mono font-bold">{financialYear}</span>.
              <div className="mt-3">
                <Button variant="outline" onClick={() => setFinancialYear(importedFYs[0])}>
                  Switch UI to {importedFYs[0]}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={isUploading || !file} className="gap-2">
            <UploadCloud className="w-4 h-4" />
            {isUploading ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  );
}

