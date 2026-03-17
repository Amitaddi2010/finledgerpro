import { create } from 'zustand';

export type UserRole = 'super_admin' | 'ca' | 'finance_team' | 'auditor';

export interface CompanySummary {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  city?: string;
  state?: string;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
}

interface AuthState {
  user: User | null;
  companies: CompanySummary[];
  activeCompanyId: string | null;
  activeRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setCompanies: (companies: CompanySummary[], activeCompanyId?: string | null, activeRole?: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  companies: [],
  activeCompanyId: null,
  activeRole: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setCompanies: (companies, activeCompanyId, activeRole) =>
    set({
      companies,
      activeCompanyId: activeCompanyId ?? (companies[0]?.id ?? null),
      activeRole: activeRole ?? (companies[0]?.role ?? null),
    }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, companies: [], activeCompanyId: null, activeRole: null }),
}));
