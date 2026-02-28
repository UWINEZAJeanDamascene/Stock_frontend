// Currency formatting utilities for Rwandan Francs (FRW)

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0';
  return new Intl.NumberFormat('en-RW', { 
    style: 'currency', 
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyWithDecimals(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { 
    style: 'currency', 
    currency: 'RWF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-RW').format(value);
}
