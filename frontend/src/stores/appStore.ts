import { create } from 'zustand';

const getCurrentFY = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
};

const getInitialFY = () => {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('finledger.financialYear');
      if (stored) return stored;
    }
  } catch {
    // ignore storage errors and fall back to current FY
  }
  return getCurrentFY();
};

interface AppState {
  financialYear: string;
  isDarkMode: boolean;
  setFinancialYear: (fy: string) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  financialYear: getInitialFY(),
  isDarkMode: document.documentElement.classList.contains('dark'),
  setFinancialYear: (financialYear) =>
    set(() => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('finledger.financialYear', financialYear);
        }
      } catch {
        // ignore storage errors
      }
      return { financialYear };
    }),
  toggleDarkMode: () => set((state) => {
    const isDark = !state.isDarkMode;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: isDark };
  }),
}));
