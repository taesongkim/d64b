import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import { formatDateRangeLabel } from '@/utils/timeUtils';

const { width: screenWidth } = Dimensions.get('window');

export type ViewMode = 'daily' | 'weekly';

const getCellSize = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 28;
    case 'weekly': return 18;
    default: return 28;
  }
};

const getCellMargin = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 2;
    case 'weekly': return 1;
    default: return 2;
  }
};

const getLeftColWidth = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 120;
    case 'weekly': return 100;
    default: return 120;
  }
};

interface UseGridVisibleRangeProps {
  scrollX: number;
  dates: string[];
  viewMode: ViewMode;
  includeLeftCol?: boolean; // For modals without left column
}

export const useGridVisibleRange = ({
  scrollX,
  dates,
  viewMode,
  includeLeftCol = true
}: UseGridVisibleRangeProps) => {
  const columnWidth = getCellSize(viewMode) + getCellMargin(viewMode) * 2;

  const visibleRange = useMemo(() => {
    const gridWidth = screenWidth - (includeLeftCol ? getLeftColWidth(viewMode) : 0);
    const first = Math.max(0, Math.floor(scrollX / columnWidth));
    const count = Math.max(1, Math.ceil(gridWidth / columnWidth));
    const last = Math.min(dates.length - 1, first + count - 1);
    return { first, last };
  }, [scrollX, dates.length, viewMode, columnWidth, includeLeftCol]);

  const monthLabel = useMemo(() => {
    if (dates.length === 0) return '';
    return formatDateRangeLabel(dates[visibleRange.first], dates[visibleRange.last]);
  }, [dates, visibleRange]);

  return {
    visibleRange,
    monthLabel,
    columnWidth,
    getCellSize,
    getCellMargin,
    getLeftColWidth,
  };
};