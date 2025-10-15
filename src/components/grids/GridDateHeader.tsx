import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { formatDateForDisplay } from '@/utils/timeUtils';

export type ViewMode = 'daily' | 'weekly';

interface GridDateHeaderProps {
  dates: string[];
  viewMode: ViewMode;
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

export default function GridDateHeader({
  dates,
  viewMode,
}: GridDateHeaderProps): React.JSX.Element {
  const fontStyle = useFontStyle();

  const dynamicStyles = {
    dateCell: {
      width: getCellSize(viewMode),
      height: 30,
      marginHorizontal: getCellMargin(viewMode),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  };

  const formatDateLabel = (date: string): string => {
    return formatDateForDisplay(date, 'day');
  };

  return (
    <View style={styles.container}>
      <View style={styles.spacer} />
      <View style={styles.dateRow}>
        {dates.map((date, index) => (
          <View key={`header-${date}-${index}`} style={dynamicStyles.dateCell}>
            <Text style={[styles.dateText, fontStyle]}>
              {formatDateLabel(date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  spacer: {
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
});