import React, { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

type MemberRole = 'super_admin' | 'ca' | 'finance_team' | 'auditor';
type MemberStatus = 'active' | 'invited' | 'suspended';

type Member = {
  _id: string;
  userId: { _id: string; name: string; email: string };
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
};

const ROLES: MemberRole[] = ['super_admin', 'ca', 'finance_team', 'auditor'];

const ROLE_LABELS: Record<MemberRole, string> = {
  super_admin: 'Super Admin',
  ca: 'CA',
  finance_team: 'Finance Team',
  auditor: 'Auditor',
};

const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-positive/10 text-positive',
  invited: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
};

const Members: React.FC = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'finance_team' as MemberRole });
  const [inviting, setInviting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/members');
      setMembers(r.data.members || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    setModalError(null);
    setSuccess(null);
    setInviting(true);
    try {
      await api.post('/members/invite', inviteForm);
      setSuccess(`${inviteForm.email} added to this company`);
      setShowModal(false);
      setInviteForm({ email: '', role: 'finance_team' });
      await load();
    } catch (e: any) {
      setModalError(e.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const updateStatus = async (memberId: string, status: MemberStatus) => {
    setError(null);
    try {
      await api.patch(`/members/${memberId}/status`, { status });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, status } : m));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update');
    }
  };

  const updateRole = async (memberId: string, role: MemberRole) => {
    setError(null);
    try {
      await api.patch(`/members/${memberId}/role`, { role });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role } : m));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-black tracking-tight">Members</h2>
          <p className="text-muted-foreground text-sm font-medium">Manage who has access to this company</p>
        </div>
        <Button size="sm" onClick={() => { setModalError(null); setShowModal(true); }} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite Member
        </Button>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-xl border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">{success}</div>}

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-muted-foreground">Loading…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-muted-foreground">No members yet.</td></tr>
            ) : members.map(m => (
              <tr key={m._id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-bold">{m.userId?.name || '—'}</td>
                <td className="px-6 py-4 text-muted-foreground">{m.userId?.email || '—'}</td>
                <td className="px-6 py-4">
                  <select
                    value={m.role}
                    onChange={e => updateRole(m._id, e.target.value as MemberRole)}
                    disabled={m.userId?._id === user?.id}
                    className="bg-muted px-2 py-1 rounded-lg border border-border outline-none text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLORS[m.status]}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                  {new Date(m.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-6 py-4 text-right">
                  {m.userId?._id !== user?.id && (
                    m.status === 'active' ? (
                      <button
                        onClick={() => updateStatus(m._id, 'suspended')}
                        className="text-xs font-black text-destructive hover:underline"
                      >
                        Suspend
                      </button>
                    ) : m.status === 'suspended' ? (
                      <button
                        onClick={() => updateStatus(m._id, 'active')}
                        className="text-xs font-black text-positive hover:underline"
                      >
                        Reactivate
                      </button>
                    ) : null
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Invite Member</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{modalError}</div>}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email address</label>
                <input
                  type="email"
                  className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm focus:ring-2 focus:ring-accent/30"
                  placeholder="colleague@company.com"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Role</label>
                <select
                  className="w-full bg-muted px-3 py-2 rounded-xl border border-border outline-none text-sm"
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as MemberRole }))}
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3 space-y-1">
                <div><span className="font-bold">Super Admin</span> — full access including user management</div>
                <div><span className="font-bold">CA</span> — read, write, delete, approve budgets</div>
                <div><span className="font-bold">Finance Team</span> — read and write only</div>
                <div><span className="font-bold">Auditor</span> — read-only access</div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={invite} disabled={inviting || !inviteForm.email}>
                {inviting ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
