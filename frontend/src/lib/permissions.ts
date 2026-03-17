import { useAuthStore, UserRole } from '@/stores/authStore';

// What each role can do. Auditor = read-only everywhere.
const PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['read', 'write', 'delete', 'manage_users', 'manage_company', 'approve_budget'],
  ca:          ['read', 'write', 'delete', 'approve_budget'],
  finance_team:['read', 'write'],
  auditor:     ['read'],
};

export function usePermission(action: string): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return PERMISSIONS[activeRole]?.includes(action) ?? false;
}

export function can(role: UserRole | null | undefined, action: string): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(action) ?? false;
}
