/**
 * Formats a minor-unit amount compactly for chart axes and tight
 * spaces.
 *
 * Examples:
 *   50000   → "৳500"
 *   500000  → "৳5k"
 *   5000000 → "৳50k"
 *   50000000 → "৳500k"
 *   500000000 → "৳5.0M"
 *
 * Full amounts appear in tooltips and tables. This formatter is only
 * for places where horizontal space is limited.
 */
export function formatCompactTaka(minor: number): string {
  const taka = minor / 100;
  if (taka >= 1_000_000) return `৳${(taka / 1_000_000).toFixed(1)}M`;
  if (taka >= 1_000) return `৳${Math.round(taka / 1_000)}k`;
  return `৳${Math.round(taka)}`;
}

/**
 * Formats a date string (YYYY-MM-DD) as a compact "DD MMM" label for
 * chart axes.
 */
export function formatShortDate(iso: string): string {
  const [, monthStr, dayStr] = iso.split('-');
  const month = Number(monthStr);
  const day = Number(dayStr);
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const name = monthNames[month - 1] ?? '';
  return `${day} ${name}`;
}
