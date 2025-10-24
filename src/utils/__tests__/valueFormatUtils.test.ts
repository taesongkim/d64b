/**
 * Tests for value formatting utilities
 */

import { formatValueForGrid, shouldDisplayValue, getCellDisplayText } from '../valueFormatUtils';

describe('formatValueForGrid', () => {
  // Basic integer cases
  test('handles basic integers', () => {
    expect(formatValueForGrid(1)).toBe('1');
    expect(formatValueForGrid(5)).toBe('5');
    expect(formatValueForGrid(9)).toBe('9');
  });

  test('handles double digit integers', () => {
    expect(formatValueForGrid(10)).toBe('10');
    expect(formatValueForGrid(25)).toBe('25');
    expect(formatValueForGrid(99)).toBe('99');
  });

  test('handles triple digit integers - truncates', () => {
    expect(formatValueForGrid(100)).toBe('10');
    expect(formatValueForGrid(123)).toBe('12');
    expect(formatValueForGrid(999)).toBe('99');
    expect(formatValueForGrid(1000)).toBe('10'); // 1000 rounds to 10
  });

  // Decimal precision tests - NEW: 1-9 range preserves decimals
  test('handles single digit decimals - precision first', () => {
    expect(formatValueForGrid(1.5)).toBe('1.5');
    expect(formatValueForGrid(7.5)).toBe('7.5'); // The key test case!
    expect(formatValueForGrid(9.9)).toBe('9.9');
    expect(formatValueForGrid(2.1)).toBe('2.1');
  });

  test('handles single digit decimals with rounding', () => {
    expect(formatValueForGrid(1.25)).toBe('1.3'); // Rounds up from .25
    expect(formatValueForGrid(7.67)).toBe('7.7'); // Rounds up from .67
    expect(formatValueForGrid(9.24)).toBe('9.2'); // Rounds down from .24
  });

  test('handles double digit decimals - try precision first', () => {
    expect(formatValueForGrid(12.5)).toBe('13'); // Can't fit 12.5, so rounds to 13
    expect(formatValueForGrid(10.1)).toBe('10'); // Rounds down to 10
    expect(formatValueForGrid(99.7)).toBe('10'); // 99.7 rounds to 100, truncated to 10
  });

  // Decimal cases for < 1
  test('handles decimals 0.1-0.9', () => {
    expect(formatValueForGrid(0.1)).toBe('.1');
    expect(formatValueForGrid(0.5)).toBe('.5');
    expect(formatValueForGrid(0.9)).toBe('.9');
  });

  test('handles decimals 0.01-0.09', () => {
    expect(formatValueForGrid(0.01)).toBe('.01');
    expect(formatValueForGrid(0.05)).toBe('.05');
    expect(formatValueForGrid(0.09)).toBe('.09');
  });

  test('handles very small decimals', () => {
    expect(formatValueForGrid(0.001)).toBe('.0'); // Rounds to .0
    expect(formatValueForGrid(0.006)).toBe('.01'); // Rounds to .01
  });

  // Zero case
  test('handles zero', () => {
    expect(formatValueForGrid(0)).toBe('0');
  });

  // Negative numbers
  test('handles negative integers', () => {
    expect(formatValueForGrid(-1)).toBe('-1');
    expect(formatValueForGrid(-5)).toBe('-5');
    expect(formatValueForGrid(-9)).toBe('-9');
  });

  test('handles negative double digits', () => {
    expect(formatValueForGrid(-10)).toBe('-1'); // -10 becomes -1
    expect(formatValueForGrid(-25)).toBe('-2'); // -25 becomes -2
    expect(formatValueForGrid(-99)).toBe('-9'); // -99 becomes -9
  });

  test('handles negative decimals', () => {
    expect(formatValueForGrid(-0.1)).toBe('-.1');
    expect(formatValueForGrid(-0.5)).toBe('-.5');
  });

  // Edge cases
  test('handles null and undefined', () => {
    expect(formatValueForGrid(null)).toBe('');
    expect(formatValueForGrid(undefined)).toBe('');
  });

  test('handles NaN', () => {
    expect(formatValueForGrid(NaN)).toBe('');
  });
});

describe('shouldDisplayValue', () => {
  test('returns false for no status and no value', () => {
    expect(shouldDisplayValue(null, null)).toBe(false);
    expect(shouldDisplayValue(undefined, undefined)).toBe(false);
    expect(shouldDisplayValue('none', null)).toBe(false);
    expect(shouldDisplayValue('none', undefined)).toBe(false);
  });

  test('returns true for valid status', () => {
    expect(shouldDisplayValue('completed', 5)).toBe(true);
    expect(shouldDisplayValue('completed', null)).toBe(true);
    expect(shouldDisplayValue('failed', 0)).toBe(true);
    expect(shouldDisplayValue('skipped', undefined)).toBe(true);
  });

  test('returns false for none status without value', () => {
    expect(shouldDisplayValue('none', null)).toBe(false);
    expect(shouldDisplayValue('none', undefined)).toBe(false);
  });
});

describe('getCellDisplayText', () => {
  test('returns empty string when not showing values', () => {
    expect(getCellDisplayText('completed', 123, false)).toBe('');
    expect(getCellDisplayText('completed', 123, undefined)).toBe('');
  });

  test('returns empty string for no status/value', () => {
    expect(getCellDisplayText('none', null, true)).toBe('');
    expect(getCellDisplayText(null, null, true)).toBe('');
  });

  test('returns formatted value when showing values', () => {
    expect(getCellDisplayText('completed', 123, true)).toBe('12');
    expect(getCellDisplayText('completed', 0.5, true)).toBe('.5');
    expect(getCellDisplayText('failed', 99, true)).toBe('99');
  });
});