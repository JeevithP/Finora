import { format, parseISO } from "date-fns";

/**
 * Currency Formatter supporting INR, USD, EUR, GBP, etc.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  if (isNaN(numericAmount)) return "₹0.00";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    // Fallback if currency/locale is invalid
    return `₹${numericAmount.toFixed(2)}`;
  }
}

/**
 * Compact Currency Formatter for dashboard cards and charts (e.g., ₹25.4K or ₹1.2L)
 */
export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  if (isNaN(numericAmount)) return "₹0";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numericAmount);
  } catch {
    return `₹${numericAmount.toFixed(0)}`;
  }
}

/**
 * Date Formatter using date-fns
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatString: string = "dd MMM yyyy"
): string {
  if (!date) return "—";
  try {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return format(parsedDate, formatString);
  } catch {
    return "Invalid Date";
  }
}

/**
 * Percentage Formatter
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
}
