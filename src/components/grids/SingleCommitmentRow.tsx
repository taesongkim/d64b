import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import CustomXIcon from '../CustomXIcon';
import CustomCheckmarkIcon from '../CustomCheckmarkIcon';
import { RecordStatus } from '@/store/slices/recordsSlice';
import { isWeekend, getTodayISO } from '@/utils/timeUtils';
import { getCellVisualTreatment, determineCellState } from './gridPalette';
import { useThemeMode } from '@/contexts/ThemeContext';
import CellShimmerOverlay from './CellShimmerOverlay';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { GRID_DEBUG } from '@/_shared/debug';
import { getPressPoint } from './getPressPoint';
import { getCellDisplayText } from '@/utils/valueFormatUtils';

export type ViewMode = 'daily' | 'weekly';

interface Commitment {
  id: string;
  title: string;
  color: string;
  type: 'binary' | 'counter' | 'timer';
  commitmentType: 'checkbox' | 'measurement';
  requirements?: string[];
  ratingRange?: { min: number; max: number };
  unit?: string;
  streak: number;
  showValues?: boolean;
}

interface DayRecord {
  date: string;
  commitmentId: string;
  status: RecordStatus;
  value?: any;
}

interface SingleCommitmentRowProps {
  commitment: Commitment;
  dates: string[];
  records: DayRecord[];
  viewMode: ViewMode;
  rowIndex: number;
  onCellPress: (commitmentId: string, date: string, event: any) => void;
  onLongPress: (commitmentId: string, date: string) => void;
  gridContext?: 'home' | 'modal';
}

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

const getCellBorderRadius = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 4;
    case 'weekly': return 3;
    default: return 4;
  }
};

const getRowSpacing = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 4;
    case 'weekly': return 2;
    default: return 4;
  }
};

export default function SingleCommitmentRow({
  commitment,
  dates,
  records,
  viewMode,
  rowIndex,
  onCellPress,
  onLongPress,
  gridContext = 'home',
}: SingleCommitmentRowProps): React.JSX.Element {
  const todayISO = getTodayISO();
  const reduceMotion = useReduceMotion();
  const themeMode = useThemeMode();

  // Gesture exclusivity state - prevent both press and long-press from firing
  const gestureStateRef = useRef<{
    longPressTriggered: boolean;
  }>({
    longPressTriggered: false,
  });

  const rowContainerStyle = useMemo((): StyleProp<ViewStyle> => [
    styles.rowContainer,
    { marginBottom: getRowSpacing(viewMode) }
  ], [viewMode]);

  const handleCellPress = useCallback((date: string, event: any) => {
    // Check gesture exclusivity - don't fire press if long-press already triggered
    if (gestureStateRef.current.longPressTriggered) {
      return;
    }

    // DEV instrumentation
    if (GRID_DEBUG) {
      console.log('[cell-gesture]', {
        surface: gridContext,
        type: 'press',
        hasEvent: !!event,
        hasNative: !!event?.nativeEvent,
        longPressTriggered: gestureStateRef.current.longPressTriggered
      });
    }

    // Capture event fields before any async work
    getPressPoint(event, null);
    event?.persist?.();

    onCellPress(commitment.id, date, event);
  }, [commitment.id, onCellPress, gridContext]);

  const handleLongPress = useCallback((date: string) => {
    // Mark long-press as triggered to prevent press from firing
    gestureStateRef.current.longPressTriggered = true;

    // DEV instrumentation
    if (GRID_DEBUG) {
      console.log('[cell-gesture]', {
        surface: gridContext,
        type: 'longPress',
        hasEvent: false,
        hasNative: false,
        longPressTriggered: gestureStateRef.current.longPressTriggered
      });
    }

    // Both home and modal contexts: long-press opens CommitmentCellModal
    onLongPress(commitment.id, date);
  }, [commitment.id, onLongPress, gridContext]);

  const createCellPressHandler = useCallback((date: string) => (event: any) => {
    handleCellPress(date, event);
  }, [handleCellPress]);

  const createLongPressHandler = useCallback((date: string) => () => {
    handleLongPress(date);
  }, [handleLongPress]);

  const handlePressIn = useCallback(() => {
    // Reset gesture state on press start
    gestureStateRef.current.longPressTriggered = false;
  }, []);

  const handlePressOut = useCallback(() => {
    // Reset gesture state when press ends
    gestureStateRef.current.longPressTriggered = false;
  }, []);

  return (
    <View style={rowContainerStyle}>
      {dates.map((date) => {
        const record = records.find(r => r.commitmentId === commitment.id && r.date === date);
        const status = record?.status || 'none';
        const isWeekendDay = isWeekend(date);
        const isTodayDate = date === todayISO;

        // Determine cell state and visual treatment using centralized palette
        const cellState = determineCellState(status, isWeekendDay, isTodayDate);
        const visualTreatment = getCellVisualTreatment(cellState, themeMode);

        const cellSize = getCellSize(viewMode);
        const cellRadius = getCellBorderRadius(viewMode);

        const dynamicCellStyle: ViewStyle = {
          width: cellSize,
          height: cellSize,
          marginHorizontal: getCellMargin(viewMode),
          borderRadius: cellRadius,
          backgroundColor: visualTreatment.backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: visualTreatment.borderWidth,
          borderColor: visualTreatment.borderColor,
        };

        const cellStyle: StyleProp<ViewStyle> = StyleSheet.compose(styles.cell, dynamicCellStyle);

        // Determine if we should show values or icons
        const shouldShowValues = commitment.showValues && commitment.commitmentType === 'measurement';
        const displayText = getCellDisplayText(status, record?.value, shouldShowValues);


        let cellContent = null;
        if (shouldShowValues) {
          // When showing values, always show text (even if empty)
          if (displayText) {
            cellContent = (
              <Text style={{
                color: 'white',
                fontSize: viewMode === 'daily' ? 12 : 10,
                fontWeight: '600',
                textAlign: 'center',
              }}>
                {displayText}
              </Text>
            );
          }
          // If shouldShowValues is true but no displayText, show nothing (no icons)
        } else {
          // Show icons (existing behavior)
          if (status === 'completed') {
            cellContent = <CustomCheckmarkIcon size={12.32} color="white" strokeWidth={2.2} />;
          } else if (status === 'failed') {
            cellContent = <CustomXIcon size={10} color="white" strokeWidth={2.5} />;
          }
        }

        return (
          <TouchableOpacity
            key={`${commitment.id}-${date}`}
            style={cellStyle}
            onPress={createCellPressHandler(date)}
            onLongPress={createLongPressHandler(date)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            delayLongPress={400}
          >
            {cellContent}
            <CellShimmerOverlay
              size={cellSize}
              radius={cellRadius}
              rowIndex={rowIndex}
              isToday={isTodayDate}
              isVisible={true}
              reduceMotion={reduceMotion}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
  },
  cell: {
    // Base cell style - stable reference
  },
});