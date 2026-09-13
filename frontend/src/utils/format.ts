/**
 * Formats a minor-unit amount as a decimal string without a currency
 * symbol. Callers add `৳` or `BDT` where appropriate.
 *
 * Example: 570000 → "5,700.00"
 */
export function formatMinor(minorUnits: number): string {
  return (minorUnits / 100).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a minor-unit amount with the Taka symbol.
 *
 * Example: 570000 → "৳5,700.00"
 */
export function formatBdt(minorUnits: number): string {
  return `৳${formatMinor(minorUnits)}`;
}

/**
 * Formats an ISO date or datetime string as "DD MMM YYYY".
 *
 * Example: "2026-09-13T08:30:00.000Z" → "13 Sep 2026"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats an ISO date string as "DD MMM YYYY HH:mm" in local time.
 *
 * Example: "2026-09-13T08:30:00.000Z" → "13 Sep 2026 14:30"
 *          (assuming local timezone is UTC+6)
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
