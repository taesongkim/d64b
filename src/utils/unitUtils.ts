/**
 * Utility functions for unit normalization and display
 */

/**
 * Normalizes a unit string for consistent database storage
 * Converts to lowercase and singular form
 * @param unit - The unit string as entered by the user
 * @returns Normalized unit string (lowercase, singular)
 */
export function normalizeUnit(unit: string): string {
  if (!unit || typeof unit !== 'string') {
    return '';
  }

  const trimmed = unit.trim().toLowerCase();

  // Basic pluralization rules for common units
  const pluralToSingular: Record<string, string> = {
    // Time units
    'hours': 'hour',
    'minutes': 'minute',
    'mins': 'min',
    'seconds': 'second',
    'secs': 'sec',
    'days': 'day',
    'weeks': 'week',
    'months': 'month',
    'years': 'year',

    // Distance units
    'miles': 'mile',
    'kilometers': 'kilometer',
    'kms': 'km',
    'feet': 'foot',
    'meters': 'meter',
    'yards': 'yard',
    'inches': 'inch',

    // Volume units
    'cups': 'cup',
    'glasses': 'glass',
    'bottles': 'bottle',
    'liters': 'liter',
    'gallons': 'gallon',
    'ounces': 'ounce',
    'milliliters': 'milliliter',
    'mls': 'ml',

    // Weight units
    'pounds': 'pound',
    'lbs': 'lb',
    'kilograms': 'kilogram',
    'kgs': 'kg',
    'grams': 'gram',
    'ounces': 'ounce',

    // Exercise units
    'reps': 'rep',
    'sets': 'set',
    'pushups': 'pushup',
    'situps': 'situp',
    'squats': 'squat',

    // Other common units
    'pages': 'page',
    'books': 'book',
    'chapters': 'chapter',
    'calories': 'calorie',
    'steps': 'step',
    'words': 'word',
    'emails': 'email',
    'calls': 'call',
    'meetings': 'meeting',
  };

  // Check if we have a specific mapping
  if (pluralToSingular[trimmed]) {
    return pluralToSingular[trimmed];
  }

  // Basic rule: if ends with 's' and is longer than 3 characters, remove the 's'
  // This covers most English plural forms
  if (trimmed.length > 3 && trimmed.endsWith('s')) {
    // Handle special cases like 'ies' endings
    if (trimmed.endsWith('ies')) {
      return trimmed.slice(0, -3) + 'y';
    }
    // Handle 'es' endings
    if (trimmed.endsWith('es') && trimmed.length > 4) {
      return trimmed.slice(0, -2);
    }
    // Standard 's' removal
    return trimmed.slice(0, -1);
  }

  // Return as-is if no pluralization detected
  return trimmed;
}

/**
 * Creates the display form of a unit (handles pluralization for display)
 * @param unit - The normalized unit (singular form)
 * @param value - The numeric value to determine singular/plural
 * @returns Display-ready unit string
 */
export function getDisplayUnit(unit: string, value: number): string {
  if (!unit || value === 1) {
    return unit;
  }

  // Special cases for irregular plurals
  const singularToPlural: Record<string, string> = {
    'foot': 'feet',
    'person': 'people',
    'child': 'children',
    'tooth': 'teeth',
    'mouse': 'mice',
    'goose': 'geese',
  };

  if (singularToPlural[unit]) {
    return singularToPlural[unit];
  }

  // Handle 'y' endings
  if (unit.endsWith('y')) {
    return unit.slice(0, -1) + 'ies';
  }

  // Handle 's', 'x', 'z', 'ch', 'sh' endings
  if (unit.endsWith('s') || unit.endsWith('x') || unit.endsWith('z') ||
      unit.endsWith('ch') || unit.endsWith('sh')) {
    return unit + 'es';
  }

  // Standard pluralization: add 's'
  return unit + 's';
}