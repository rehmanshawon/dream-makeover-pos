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

/**
 * Parses a Taka string (e.g., "1250.50") into an integer number of
 * poisha. Uses Math.round to avoid floating-point drift.
 *
 * Returns null if the input is not a valid positive number.
 */
export function parseTakaToMinor(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

/**
 * Formats a minor-unit amount as a Taka decimal string suitable for an
 * input field. Omits the currency symbol and thousand separators.
 *
 * Example: 125050 → "1250.50"
 */
export function minorToTakaInput(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

/**
 * Returns today's date as YYYY-MM-DD in the user's local timezone.
 *
 * Used for date-range queries. Uses local time because business days
 * are defined in the salon's local timezone, not UTC.
 */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
