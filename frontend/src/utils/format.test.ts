import { describe, expect, it } from 'vitest';
import {
  formatBdt,
  formatDate,
  formatDateTime,
  formatMinor,
  minorToTakaInput,
  parseTakaToMinor,
} from './format';

describe('formatMinor', () => {
  it('formats minor units with two decimals and thousands separators', () => {
    expect(formatMinor(570000)).toBe('5,700.00');
    expect(formatMinor(100)).toBe('1.00');
    expect(formatMinor(0)).toBe('0.00');
  });
});

describe('formatBdt', () => {
  it('prepends the Taka symbol', () => {
    expect(formatBdt(570000)).toBe('৳5,700.00');
  });
});

describe('parseTakaToMinor', () => {
  it('parses integer strings', () => {
    expect(parseTakaToMinor('100')).toBe(10000);
  });

  it('parses decimal strings', () => {
    expect(parseTakaToMinor('1250.50')).toBe(125050);
  });

  it('rounds values with floating point drift', () => {
    expect(parseTakaToMinor('0.29')).toBe(29);
    expect(parseTakaToMinor('12.34')).toBe(1234);
    expect(parseTakaToMinor('99.99')).toBe(9999);
  });

  it('returns null for empty input', () => {
    expect(parseTakaToMinor('')).toBeNull();
    expect(parseTakaToMinor('   ')).toBeNull();
  });

  it('returns null for negative input', () => {
    expect(parseTakaToMinor('-10')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseTakaToMinor('abc')).toBeNull();
    expect(parseTakaToMinor('12abc')).toBeNull();
  });

  it('accepts zero', () => {
    expect(parseTakaToMinor('0')).toBe(0);
    expect(parseTakaToMinor('0.00')).toBe(0);
  });
});

describe('minorToTakaInput', () => {
  it('produces a decimal string without separators', () => {
    expect(minorToTakaInput(125050)).toBe('1250.50');
    expect(minorToTakaInput(100)).toBe('1.00');
    expect(minorToTakaInput(0)).toBe('0.00');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as DD MMM YYYY', () => {
    // 2026-09-13 is a Sunday
    expect(formatDate('2026-09-13T08:30:00.000Z')).toMatch(/13 Sept 2026/);
  });
});

describe('formatDateTime', () => {
  it('includes both date and time', () => {
    const result = formatDateTime('2026-09-13T08:30:00.000Z');

    expect(result).toMatch(/13 Sept 2026, 14:30/);
  });
});
