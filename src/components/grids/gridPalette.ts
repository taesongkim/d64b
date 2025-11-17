/**
 * Centralized grid palette and visual treatment helpers
 * Single source of truth for all grid cell colors and styling
 *
 * Note: Neutral today ring; column highlight removed by design
 */

import { createSemanticColors, getThemeColors, type ThemeMode } from '@/constants/grayscaleTokens';
import { designTokens } from '@/constants/designTokens';

export type CellState = 'completed' | 'skipped' | 'failed' | 'weekend' | 'today' | 'idle';

// Cell color interface for background and content
export interface CellColors {
  background: string;
  content: string;
}

// Get comprehensive cell colors for both background and content
export function getCellColors(state: CellState, mode: ThemeMode): CellColors {
  const grayTokens = getThemeColors(mode);
  const cellTokens = designTokens.cellColors[mode];

  // Map cell states to design token keys
  const stateMapping = {
    completed: 'success',
    skipped: 'skipped',
    failed: 'fail',
    idle: 'idle',
    weekend: 'weekend',
    today: 'today',
  } as const;

  const tokenKey = stateMapping[state];
  const baseColors = cellTokens[tokenKey];

  // For gray states, use actual gray tokens instead of hardcoded values
  if (state === 'idle' || state === 'today') {
    return {
      background: grayTokens.gray200,
      content: baseColors.content,
    };
  }

  if (state === 'weekend') {
    return {
      background: grayTokens.gray300,
      content: baseColors.content,
    };
  }

  // For success/fail states, use the design token values directly
  return baseColors;
}

// Legacy function for backward compatibility - returns just background colors
export function getGridColors(mode: ThemeMode) {
  const grayTokens = getThemeColors(mode);
  const cellTokens = designTokens.cellColors[mode];

  return {
    idle: grayTokens.gray200,
    completed: cellTokens.success.background,
    skipped: cellTokens.skipped.background,
    failed: cellTokens.fail.background,
    weekend: grayTokens.gray300,
    today: grayTokens.gray200,
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