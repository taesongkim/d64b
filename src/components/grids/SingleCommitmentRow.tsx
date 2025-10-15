import React, { useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  useColorScheme,
} from 'react-native';
import CustomXIcon from '../CustomXIcon';
import CustomCheckmarkIcon from '../CustomCheckmarkIcon';
import { RecordStatus } from '@/store/slices/recordsSlice';
import { isWeekend, getTodayISO } from '@/utils/timeUtils';
import { getCellVisualTreatment, determineCellState, type ColorScheme } from './gridPalette';

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
  onCellPress: (commitmentId: string, date: string) => void;
  onLongPress: (commitmentId: string, date: string, event: any) => void;
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
  onCellPress,
  onLongPress,
}: SingleCommitmentRowProps): React.JSX.Element {
  const todayISO = getTodayISO();
  const colorScheme = useColorScheme() as ColorScheme ?? 'light';

  const rowContainerStyle = useMemo((): StyleProp<ViewStyle> => [
    styles.rowContainer,
    { marginBottom: getRowSpacing(viewMode) }
  ], [viewMode]);

  const handleCellPress = useCallback((date: string) => {
    onCellPress(commitment.id, date);
  }, [commitment.id, onCellPress]);

  const handleLongPress = useCallback((date: string, event: any) => {
    onLongPress(commitment.id, date, event);
  }, [commitment.id, onLongPress]);

  const createCellPressHandler = useCallback((date: string) => () => {
    handleCellPress(date);
  }, [handleCellPress]);

  const createLongPressHandler = useCallback((date: string) => (event: any) => {
    handleLongPress(date, event);
  }, [handleLongPress]);

  return (
    <View style={rowContainerStyle}>
      {dates.map((date) => {
        const record = records.find(r => r.commitmentId === commitment.id && r.date === date);
        const status = record?.status || 'none';
        const isWeekendDay = isWeekend(date);
        const isTodayDate = date === todayISO;

        // Determine cell state and visual treatment using centralized palette
        const cellState = determineCellState(status, isWeekendDay, isTodayDate);
        const visualTreatment = getCellVisualTreatment(cellState, isTodayDate, colorScheme);

        const dynamicCellStyle: ViewStyle = {
          width: getCellSize(viewMode),
          height: getCellSize(viewMode),
          marginHorizontal: getCellMargin(viewMode),
          borderRadius: getCellBorderRadius(viewMode),
          backgroundColor: visualTreatment.backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          // Neutral today ring with transparent base borders
          borderWidth: visualTreatment.borderWidth,
          borderColor: visualTreatment.borderColor,
        };

        const cellStyle: StyleProp<ViewStyle> = StyleSheet.compose(styles.cell, dynamicCellStyle);

        let cellContent = null;
        if (status === 'completed') {
          cellContent = <CustomCheckmarkIcon size={12.32} color="white" strokeWidth={2.2} />;
        } else if (status === 'failed') {
          cellContent = <CustomXIcon size={10} color="white" strokeWidth={2.5} />;
        }

        return (
          <TouchableOpacity
            key={`${commitment.id}-${date}`}
            style={cellStyle}
            onPress={createCellPressHandler(date)}
            onLongPress={createLongPressHandler(date)}
            delayLongPress={500}
          >
            {cellContent}
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