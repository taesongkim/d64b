/**
 * Centralized grid palette and visual treatment helpers
 * Single source of truth for all grid cell colors and styling
 *
 * Note: Today ring shimmer with hue-matched colors; column highlight removed by design
 */

export type CellState = 'completed' | 'skipped' | 'failed' | 'weekend' | 'today' | 'idle';
export type ColorScheme = 'light' | 'dark';

// Core color palette for grid cells
export const GRID_COLORS = {
  idle: '#F3F4F6',
  completed: '#10B981',
  skipped: '#10B981',    // Intentionally same as completed per product decision
  failed: '#EF4444',
  weekend: '#E5E7EB',
  today: '#F3F4F6',      // Base color for today (will have ring styling)
} as const;

// Ring thickness constant for layout stability
export const RING_THICKNESS = 1;

// Today ring shimmer styling constants
export const TODAY_RING = {
  thickness: RING_THICKNESS,
  transparent: 'transparent', // For base borders to prevent layout jitter
} as const;

// Visual treatment interface for cell styling
export interface CellVisualTreatment {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

// HSL helper functions for ring color generation
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get ring base color with hue matching and contrast enhancement
 * @param cellState - Current cell state for color matching
 * @param colorScheme - Light or dark mode
 * @returns Enhanced ring color matching cell state hue
 */
export function getRingBaseColor(cellState: CellState, colorScheme: ColorScheme): string {
  const baseColor = GRID_COLORS[cellState];
  const [h, s, l] = hexToHsl(baseColor);

  // HSL enhancements: +8% saturation, lightness adjusted by mode
  const enhancedS = Math.min(100, s + 8);
  const enhancedL = colorScheme === 'light'
    ? Math.min(100, l + 10)  // +10% lightness in light mode
    : Math.max(0, l - 10);   // -10% lightness in dark mode

  return hslToHex(h, enhancedS, enhancedL);
}

/**
 * Generate shimmer gradient colors for diagonal sweep effect
 * @param ringColor - Base ring color to build gradient from
 * @param colorScheme - Current color scheme for gradient intensity
 * @returns Array of 3 gradient colors with transparency
 */
export function getShimmerGradient(ringColor: string, colorScheme: ColorScheme): string[] {
  const [h, s, l] = hexToHsl(ringColor);

  // Create gradient with transparent → bright → transparent
  const intensity = colorScheme === 'light' ? 15 : 20; // Slightly more intense in dark mode
  const brightL = Math.min(100, l + intensity);

  const transparent = 'rgba(255, 255, 255, 0)';
  const bright = hslToHex(h, s, brightL);

  return [transparent, bright, transparent];
}

/**
 * Pure helper function to resolve cell visual treatment
 * @param cellState - The current state of the cell
 * @param isToday - Whether this cell represents today's date (now handled by shimmer)
 * @param colorScheme - Current color scheme (kept for API compatibility)
 * @returns Visual treatment configuration for the cell
 */
export function getCellVisualTreatment(
  cellState: CellState
): CellVisualTreatment {
  const backgroundColor = GRID_COLORS[cellState];

  return {
    backgroundColor,
    borderColor: TODAY_RING.transparent, // All cells have transparent border
    borderWidth: RING_THICKNESS, // Always 1px to prevent layout jitter
  };
}

/**
 * Helper to determine cell state based on record status and date properties
 * @param status - Record status from the database
 * @param isWeekend - Whether the date is a weekend
 * @param isToday - Whether the date is today
 * @returns The appropriate cell state
 */
export function determineCellState(
  status: string | null | undefined,
  isWeekend: boolean,
  isToday: boolean
): CellState {
  // Priority order: status > weekend > today > idle
  if (status === 'completed') return 'completed';
  if (status === 'skipped') return 'skipped';
  if (status === 'failed') return 'failed';
  if (isWeekend) return 'weekend';
  if (isToday) return 'today';
  return 'idle';
}