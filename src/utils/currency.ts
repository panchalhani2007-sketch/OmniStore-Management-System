/**
 * Utility helpers for Indian Rupee (INR) currency formatting and Indian numbering (en-IN).
 */

export const DEFAULT_CURRENCY_SYMBOL = '₹';

/**
 * Resolves the configured currency symbol, defaulting to ₹ (INR)
 * and migrating any legacy '$' default symbol to '₹'.
 */
export function resolveCurrencySymbol(symbol?: string | null): string {
  const trimmed = symbol?.trim();
  if (!trimmed || trimmed === '$') {
    return DEFAULT_CURRENCY_SYMBOL;
  }
  return trimmed;
}

/**
 * Formats a number using Indian numbering system grouping (e.g. 1,00,000.00).
 */
export function formatIndianNumber(value: number, decimals = 2): string {
  const safeNum = Number.isFinite(value) ? value : 0;
  return safeNum.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a monetary value with the INR symbol (₹) and Indian number grouping.
 * Produces "-₹1,00,000.00" for negative values.
 */
export function formatCurrency(
  amount: number,
  symbol?: string | null,
  decimals = 2
): string {
  const curr = resolveCurrencySymbol(symbol);
  const safeNum = Number.isFinite(amount) ? amount : 0;
  const isNegative = safeNum < 0;
  const formatted = formatIndianNumber(Math.abs(safeNum), decimals);
  return isNegative ? `-${curr}${formatted}` : `${curr}${formatted}`;
}
