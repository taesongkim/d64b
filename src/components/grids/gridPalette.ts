/**
 * Centralized grid palette and visual treatment helpers
 * Single source of truth for all grid cell colors and styling
 *
 * Note: Neutral today ring; column highlight removed by design
 */

import { createSemanticColors, getThemeColors, type ThemeMode } from '@/constants/grayscaleTokens';

export type CellState = 'completed' | 'skipped' | 'failed' | 'weekend' | 'today' | 'idle';

// Core color palette for grid cells - now theme-aware
export function getGridColors(mode: ThemeMode) {
  const colors = getThemeColors(mode);

  return {
    idle: colors.gray200,           // Two notches above background (weekday empty)
    completed: '#10B981',
    skipped: '#10B981',             // Intentionally same as completed per product decision
    failed: '#EF4444',
    weekend: colors.gray300,        // One notch darker than idle for weekends
    today: colors.gray200,          // Base color for today (will have ring styling)
  } as const;
}


// Visual treatment interface for cell styling
export interface CellVisualTreatment {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}


/**
 * Pure helper function to resolve cell visual treatment
 * @param cellState - The current state of the cell
 * @param mode - The current theme mode
 * @returns Visual treatment configuration for the cell
 */
export function getCellVisualTreatment(cellState: CellState, mode: ThemeMode): CellVisualTreatment {
  const gridColors = getGridColors(mode);
  const backgroundColor = gridColors[cellState];

  return {
    backgroundColor,
    borderColor: 'transparent',
    borderWidth: 0,
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