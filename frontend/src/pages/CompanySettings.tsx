import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const CompanySettings: React.FC = () => {
  const { companies, activeCompanyId } = useAuthStore();
  const active = companies.find((c) => c.id === activeCompanyId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    financialYearStart: 4,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const resp = await api.get('/companies/active');
        const c = resp.data?.company;
        setForm({
          name: c?.name || '',
          gstin: c?.gstin || '',
          pan: c?.pan || '',
          address: c?.address || '',
          city: c?.city || '',
          state: c?.state || '',
          financialYearStart: c?.financialYearStart ?? 4,
        });
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load company');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeCompanyId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/companies/active', form);
      setSuccess('Saved.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Company Settings</h2>
          <p className="text-muted-foreground text-sm font-medium">
            {active?.name ? `Editing: ${active.name}` : 'Edit active company'}
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
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

      <div className="bg-card border p-6 rounded-2xl shadow-sm">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Company name">
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Financial year start month (number)">
              <input
                className={inputCls}
                value={String(form.financialYearStart)}
                onChange={(e) => setForm((f) => ({ ...f, financialYearStart: Number(e.target.value) }))}
              />
            </Field>
            <Field label="GSTIN">
              <input className={inputCls} value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
            </Field>
            <Field label="PAN">
              <input className={inputCls} value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </Field>
            <Field label="State">
              <input className={inputCls} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            </Field>
            <Field label="Address">
              <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
};

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{props.label}</label>
      {props.children}
    </div>
  );
}

const inputCls =
  'w-full bg-muted px-3 py-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-accent/30';

export default CompanySettings;

