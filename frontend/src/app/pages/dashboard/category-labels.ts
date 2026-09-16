/**
 * Maps backend expense category enum values to human-readable labels.
 *
 * The backend enum values are identifiers in SCREAMING_CASE. The
 * dashboard shows them in Title Case with word spacing.
 */
const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  INTERNET: 'Internet',
  RENT: 'Rent',
  MAINTENANCE: 'Maintenance',
  CLEANING: 'Cleaning',
  STATIONERY: 'Stationery',
  TRANSPORTATION: 'Transportation',
  MARKETING: 'Marketing',
  EQUIPMENT: 'Equipment',
  MISC: 'Miscellaneous',
};

export function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
