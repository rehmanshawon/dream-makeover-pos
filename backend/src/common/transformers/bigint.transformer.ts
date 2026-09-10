import type { ValueTransformer } from 'typeorm';

/**
 * Transforms MySQL BIGINT columns to JavaScript numbers.
 *
 * Why this exists:
 * The mysql2 driver returns BIGINT values as strings because JavaScript's
 * Number type cannot safely represent all 64-bit integers.
 *
 * For monetary values in this POS, all amounts fit well within
 * Number.MAX_SAFE_INTEGER (about 9 quadrillion). We therefore safely
 * convert strings to numbers so callers never deal with strings.
 *
 * If a future column may exceed Number.MAX_SAFE_INTEGER, do NOT use this
 * transformer for that column.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | number | null | undefined): number | null | undefined => {
    if (value === null || value === undefined) return value;
    return typeof value === 'number' ? value : Number(value);
  },
};
