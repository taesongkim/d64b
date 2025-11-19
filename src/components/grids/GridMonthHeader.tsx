import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';
import { useSemanticColors } from '@/contexts/ThemeContext';

interface GridMonthHeaderProps {
  monthLabel: string;
}

export default function GridMonthHeader({
  monthLabel,
}: GridMonthHeaderProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const semanticColors = useSemanticColors();

  return (
    <View style={styles.monthHeader}>
      <Text style={[styles.monthText, fontStyle, { color: semanticColors.tertiaryText }]}>
        {monthLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    marginBottom: 4,
    paddingLeft: 0,
  },
  monthText: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
  },
});