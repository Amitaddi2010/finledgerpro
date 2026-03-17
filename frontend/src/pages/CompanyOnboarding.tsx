import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

const CompanyOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { companies, setCompanies, user } = useAuthStore();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCompanies = async () => {
    const resp = await api.get('/companies');
    setCompanies(resp.data.companies || [], resp.data.activeCompanyId || null, resp.data.activeRole || null);
  };

  const switchCompany = async (companyId: string) => {
    await api.post(`/companies/${companyId}/switch`);
    await refreshCompanies();
    navigate('/dashboard');
  };

  const createCompany = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await api.post('/companies', { name, city, state });
      await refreshCompanies();
      const next = useAuthStore.getState().companies?.[0];
      if (next?.id) {
        await switchCompany(next.id);
      } else {
        navigate('/dashboard');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create company');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">Select or Create a Company</div>
            <div className="text-white/50 text-sm">
              Signed in as <span className="font-semibold text-white/80">{user?.email}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Your companies</div>
            <div className="space-y-3">
              {companies.length === 0 ? (
                <div className="text-white/50 text-sm">No companies yet. Create your first one.</div>
              ) : (
                companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => switchCompany(c.id)}
                    className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold">{c.name}</div>
                        <div className="text-[11px] text-white/40 uppercase tracking-widest">
                          {c.city || '—'} · {c.state || '—'}
                        </div>
                      </div>
                      <div className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70 font-black uppercase tracking-widest">
                        {c.role.replace('_', ' ')}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-black uppercase tracking-widest text-white/40">Create a company</div>
              <div className="flex items-center gap-2 text-[10px] text-white/40 font-black uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" /> Super admin only
              </div>
            </div>

            <div className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company name"
                className="w-full bg-slate-900 border border-slate-800 focus:border-accent text-white px-4 py-3 rounded-xl outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-accent text-white px-4 py-3 rounded-xl outline-none"
                />
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-accent text-white px-4 py-3 rounded-xl outline-none"
                />
              </div>

              <Button
                onClick={createCompany}
                disabled={isCreating || !name.trim()}
                className="w-full bg-accent hover:bg-accent/90 text-white font-heading font-black text-base py-6 rounded-xl shadow-lg shadow-accent/20"
              >
                <span className="flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Create Company
                </span>
              </Button>
              <div className="text-xs text-white/40">
                If you’re not a super admin, ask your admin to create the company and grant you access.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;

