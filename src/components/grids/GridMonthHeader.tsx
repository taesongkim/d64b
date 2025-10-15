import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useFontStyle } from '@/hooks/useFontStyle';

interface GridMonthHeaderProps {
  monthLabel: string;
}

export default function GridMonthHeader({
  monthLabel,
}: GridMonthHeaderProps): React.JSX.Element {
  const fontStyle = useFontStyle();

  return (
    <View style={styles.monthHeader}>
      <Text style={[styles.monthText, fontStyle]}>
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
    color: '#9CA3AF',
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'uppercase',
  },
});