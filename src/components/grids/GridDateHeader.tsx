import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { formatDateForDisplay, isToday } from '@/utils/timeUtils';
import { useSemanticColors, useThemeMode } from '@/contexts/ThemeContext';
import { getThemeColors } from '@/constants/grayscaleTokens';

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
  const semanticColors = useSemanticColors();
  const themeMode = useThemeMode();
  const colors = getThemeColors(themeMode);
  const fontStyle = useFontStyle();
  const boldFontStyle = useFontStyle(styles.todayDateText, 'semiBold');

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
        {dates.map((date, index) => {
          const isTodayDate = isToday(date);
          const textStyle = isTodayDate
            ? boldFontStyle
            : [styles.dateText, fontStyle];
          return (
            <View key={`header-${date}-${index}`} style={dynamicStyles.dateCell}>
              <Text style={textStyle}>
                {formatDateLabel(date)}
              </Text>
            </View>
          );
        })}
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
    lineHeight: 16,
  },
  todayDateText: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 16,
  },
});