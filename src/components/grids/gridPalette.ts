/**
 * Centralized grid palette and visual treatment helpers
 * Single source of truth for all grid cell colors and styling
 *
 * Note: Today cells use shimmer overlay animation; column highlight removed by design
 * Shimmer uses full-white PNG asset (assets/ui/shimmer-diagonal.png) with 50% opacity applied at runtime
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
  today: '#F3F4F6',      // Base color for today (shimmer overlay applied separately)
} as const;


// Visual treatment interface for cell styling
export interface CellVisualTreatment {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}


/**
 * Pure helper function to resolve cell visual treatment
 * @param cellState - The current state of the cell
 * @returns Visual treatment configuration for the cell
 */
export function getCellVisualTreatment(cellState: CellState): CellVisualTreatment {
  const backgroundColor = GRID_COLORS[cellState];

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