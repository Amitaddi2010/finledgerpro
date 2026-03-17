export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function toLakhsCrores(amount: number): string {
  if (Math.abs(amount) >= 1_00_00_000) {
    return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)} L`;
  }
  return `₹${formatINR(amount)}`;
}

export const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
}

export function getMonthsElapsed(financialYear: string): number {
  if (!financialYear || !financialYear.includes('-')) {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getMonth() - 2 : now.getMonth() + 10;
  }
  const startYear = parseInt(financialYear.split('-')[0]);
  const fyStart = new Date(startYear, 3, 1); // April 1
  const now = new Date();
  const months = (now.getFullYear() - fyStart.getFullYear()) * 12 + (now.getMonth() - fyStart.getMonth()) + 1;
  return Math.min(Math.max(months, 0), 12);
}
