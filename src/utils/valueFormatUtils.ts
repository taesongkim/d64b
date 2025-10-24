/**
 * Utility functions for formatting numeric values for grid cell display
 */

/**
 * Formats a numeric value for display in grid cells with a maximum of 2 characters
 *
 * Rules:
 * - Max 2 characters total (including decimal point)
 * - For large numbers: truncate to fit (123 → 12, 1000 → 10)
 * - For decimals: precision is prioritized over simplicity
 * - Returns empty string for null/undefined values
 *
 * @param value - The numeric value to format
 * @returns Formatted string (max 2 characters) or empty string
 */
export function formatValueForGrid(value: number | null | undefined): string {
  // Handle null/undefined/empty cases
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to number if needed and validate
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '';
  }

  // Handle zero
  if (numValue === 0) {
    return '0';
  }

  const absValue = Math.abs(numValue);
  const isNegative = numValue < 0;

  // For negative numbers, we need to account for the minus sign
  // This leaves us with only 1 character for the actual number
  if (isNegative) {
    if (absValue >= 10) {
      // -10, -11, -99 etc → just show first digit: -1, -1, -9
      return `-${Math.floor(absValue / 10)}`;
    } else if (absValue >= 1) {
      // -1 to -9 → show as is: -1, -2, etc
      return `-${Math.floor(absValue)}`;
    } else {
      // -0.1 to -0.9 → show as decimal: -.1, -.5, etc
      const decimal = Math.floor(absValue * 10) / 10;
      return `-${decimal.toString().substring(1)}`; // Remove the 0 from 0.1 → .1
    }
  }

  // Positive numbers - precision over simplicity
  if (absValue >= 100) {
    // 100+ → show first 2 digits: 123 → 12, 1000 → 10
    const str = Math.round(absValue).toString();
    return str.substring(0, 2);
  } else if (absValue >= 10) {
    // 10-99 → try to preserve decimal if it fits in 2 chars
    const asString = absValue.toString();
    if (asString.length <= 2) {
      return asString; // 10, 99, etc - fits as is
    }

    // Try 1 decimal place: 12.5 → "13" (rounded), 10.1 → "10"
    const oneDecimal = Math.round(absValue * 10) / 10;
    const oneDecimalStr = oneDecimal.toString();
    if (oneDecimalStr.length <= 2) {
      return oneDecimalStr;
    }

    // If still too long, round to integer
    return Math.round(absValue).toString().substring(0, 2);
  } else if (absValue >= 1) {
    // 1-9 → prioritize showing decimal if possible

    // Check if it's a whole number first
    if (absValue === Math.floor(absValue)) {
      return absValue.toString(); // 1, 2, 3, etc - integers fit
    }

    // For decimals in 1-9 range, try 1 decimal place: 1.25 → 1.3, 7.67 → 7.7
    const oneDecimal = Math.round(absValue * 10) / 10;
    const oneDecimalStr = oneDecimal.toString();

    // For precision over simplicity: allow 3-char decimals like "1.5", "7.5"
    // This breaks strict 2-char limit but preserves decimal information
    if (oneDecimalStr.length <= 3 && oneDecimalStr.indexOf('.') !== -1) {
      return oneDecimalStr; // Allow "1.5", "7.5", "9.9" etc
    }

    // If still too long, round to integer
    return Math.round(absValue).toString();
  } else {
    // 0.1-0.99 → show as decimal with leading zero (max 3 chars)
    // Priority: precision over simplicity, include leading zero

    if (absValue >= 0.1) {
      // 0.1 to 0.9 → show as 0.1, 0.2, 0.9 (3 chars)
      const rounded = Math.round(absValue * 10) / 10;
      return rounded.toString(); // Keep the 0: 0.1, 0.2, etc.
    } else if (absValue >= 0.01) {
      // 0.01 to 0.099 → show as .01, .02, .09 (3 chars, no room for leading 0)
      const rounded = Math.round(absValue * 100) / 100;
      return rounded.toString().substring(1); // Remove the 0 from 0.01 → .01
    } else if (absValue > 0) {
      // Very small numbers (0.001 to 0.009) → round to nearest .01
      const rounded = Math.round(absValue * 100) / 100;
      if (rounded === 0) {
        return '.0'; // Show .0 for very small numbers that round to 0
      }
      return rounded.toString().substring(1);
    } else {
      return '0';
    }
  }
}

/**
 * Determines if a cell should display a value based on the record status and value
 *
 * @param status - The record status
 * @param value - The numeric value
 * @returns true if value should be displayed, false otherwise
 */
export function shouldDisplayValue(
  status: string | null | undefined,
  value: number | null | undefined
): boolean {
  // No number should display in a cell that has neither status nor value
  if ((!status || status === 'none') && (value === null || value === undefined)) {
    return false;
  }

  // If there's a status or a value, we can display
  return status !== null && status !== undefined && status !== 'none';
}

/**
 * Get the display text for a grid cell - either formatted value or empty string
 *
 * @param status - The record status
 * @param value - The numeric value
 * @param showValues - Whether values should be shown (toggle state)
 * @returns The text to display in the cell
 */
export function getCellDisplayText(
  status: string | null | undefined,
  value: number | null | undefined,
  showValues: boolean = false
): string {
  console.log('🎨 [Display] getCellDisplayText called:', {
    status,
    value,
    valueType: typeof value,
    showValues
  });

  // If not showing values, return empty (icons will be shown instead)
  if (!showValues) {
    return '';
  }

  // Check if we should display anything at all
  if (!shouldDisplayValue(status, value)) {
    console.log('🎨 [Display] shouldDisplayValue returned false');
    return '';
  }

  // If there's a status but no value, show 0
  if ((value === null || value === undefined) && status && status !== 'none') {
    console.log('🎨 [Display] Status exists but value is null/undefined, showing 0');
    return '0';
  }

  // Format and return the value
  const result = formatValueForGrid(value);
  console.log('🎨 [Display] formatValueForGrid result:', result);
  return result;
}