/**
 * lib/format.ts
 *
 * Display formatting utilities for ibuynaija.com.
 */

/**
 * Format a Naira price with thousand separators.
 * Handles both numeric and string values from the pg driver (NUMERIC columns
 * are returned as strings like "28500.00").
 * Returns null if price is null/undefined (caller shows "Price on request").
 */
export function formatNaira(price: number | string | null | undefined): string | null {
  if (price == null) return null;
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(n)) return null;
  return '₦' + n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
