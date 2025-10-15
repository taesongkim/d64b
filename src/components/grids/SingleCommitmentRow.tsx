import React, { useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import CustomXIcon from '../CustomXIcon';
import CustomCheckmarkIcon from '../CustomCheckmarkIcon';
import { RecordStatus } from '@/store/slices/recordsSlice';
import { isWeekend, getTodayISO } from '@/utils/timeUtils';

export type ViewMode = 'daily' | 'weekly';

// Color constants matching CommitmentGrid
const COLORS = {
  idle: '#F3F4F6',
  completed: '#10B981',
  skipped: '#10B981',
  failed: '#EF4444',
  weekend: '#E5E7EB',
  today: '#F3F4F6', // Same as idle for now
} as const;

type CellState = 'completed' | 'skipped' | 'failed' | 'weekend' | 'today' | 'idle';

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

        // Determine cell state based on priority: status > weekend > today > idle
        const cellState: CellState = (() => {
          if (status === 'completed') return 'completed';
          if (status === 'skipped') return 'skipped';
          if (status === 'failed') return 'failed';
          if (isWeekendDay) return 'weekend';
          if (isTodayDate) return 'today';
          return 'idle';
        })();

        const bgColor = COLORS[cellState];

        const dynamicCellStyle: ViewStyle = {
          width: getCellSize(viewMode),
          height: getCellSize(viewMode),
          marginHorizontal: getCellMargin(viewMode),
          borderRadius: getCellBorderRadius(viewMode),
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
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