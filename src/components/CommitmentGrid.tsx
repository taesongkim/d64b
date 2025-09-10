import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = 28;
const CELL_MARGIN = 2; // Horizontal spacing
const LEFT_COL_WIDTH = 120;
const ROW_SPACING = 4; // Match horizontal spacing

interface Commitment {
  id: string;
  title: string;
  color: string;
  type: 'binary' | 'counter' | 'timer';
  streak: number;
}

interface DayRecord {
  date: string;
  commitmentId: string;
  completed: boolean;
  value?: number;
}

interface CommitmentGridProps {
  commitments: Commitment[];
  records: DayRecord[];
  onCellPress: (commitmentId: string, date: string) => void;
  // Optional hint for the earliest date to display (e.g., account creation date)
  earliestDate?: string; // format YYYY-MM-DD
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function CommitmentGrid({ 
  commitments, 
  records, 
  onCellPress,
  earliestDate,
}: CommitmentGridProps): React.JSX.Element {
  const scrollRef = useRef<FlatList>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [dates, setDates] = useState<string[]>([]);
  const FUTURE_BUFFER_DAYS = 60; // how many future days to pre-render
  
  // Utility
  const toISODate = (d: Date) => d.toISOString().split('T')[0];

  const minRecordDate: string | null = useMemo(() => {
    if (!records || records.length === 0) return null;
    let min: string | null = null;
    for (const r of records) {
      if (!min || r.date < min) min = r.date;
    }
    return min;
  }, [records]);

  // Generate dates based on view mode
  const buildInitialDates = () => {
    const list: string[] = [];
    const today = new Date();
    
    if (viewMode === 'daily') {
      // Determine start at earliest known date (prop -> records -> today)
      const startISO = earliestDate || minRecordDate || toISODate(today);
      const start = new Date(startISO);
      const end = new Date(today);
      end.setDate(end.getDate() + FUTURE_BUFFER_DAYS);
      
      const cursor = new Date(start);
      while (cursor <= end) {
        list.push(toISODate(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (viewMode === 'weekly') {
      // Show last 12 weeks
      for (let i = 0; i < 12; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
        list.push(weekStart.toISOString().split('T')[0]);
      }
    } else {
      // Show last 12 months
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
        list.push(monthStart.toISOString().split('T')[0]);
      }
    }
    
    return list;
  };

  useEffect(() => {
    setDates(buildInitialDates());
  }, [viewMode, earliestDate, minRecordDate, toISODate(new Date())]);

  const todayISO = toISODate(new Date());
  const todayIndex = useMemo(() => {
    if (!dates || dates.length === 0) return 0;
    const idx = dates.indexOf(todayISO);
    return idx >= 0 ? idx : 0;
  }, [dates, todayISO]);

  // Extend future dates when reaching the end
  const appendFutureDates = () => {
    if (viewMode !== 'daily' || dates.length === 0) return;
    const last = new Date(dates[dates.length - 1]);
    const newDates: string[] = [];
    for (let i = 1; i <= FUTURE_BUFFER_DAYS; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() + i);
      newDates.push(toISODate(d));
    }
    setDates(prev => [...prev, ...newDates]);
  };
  
  const isCompleted = (commitmentId: string, date: string): boolean => {
    if (viewMode === 'daily') {
      return records.some(
        r => r.commitmentId === commitmentId && r.date === date && r.completed
      );
    } else if (viewMode === 'weekly') {
      // Check if any day in the week is completed
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return records.some(r => {
        if (r.commitmentId !== commitmentId || !r.completed) return false;
        const recordDate = new Date(r.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });
    } else {
      // Check if any day in the month is completed
      const monthStart = new Date(date);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      return records.some(r => {
        if (r.commitmentId !== commitmentId || !r.completed) return false;
        const recordDate = new Date(r.date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });
    }
  };
  
  const getCompletionCount = (commitmentId: string, date: string): number => {
    if (viewMode === 'weekly') {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return records.filter(r => {
        if (r.commitmentId !== commitmentId || !r.completed) return false;
        const recordDate = new Date(r.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      }).length;
    } else if (viewMode === 'monthly') {
      const monthStart = new Date(date);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      return records.filter(r => {
        if (r.commitmentId !== commitmentId || !r.completed) return false;
        const recordDate = new Date(r.date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      }).length;
    }
    return 0;
  };
  
  const formatDateLabel = (date: string): string => {
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // month is 0-indexed
    
    if (viewMode === 'daily') {
      // Show day of month
      return d.getDate().toString();
    } else if (viewMode === 'weekly') {
      // Show week number of the month
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const weekOfMonth = Math.ceil((d.getDate() + firstDay.getDay()) / 7);
      return `W${weekOfMonth}`;
    } else {
      // Show month abbreviation
      return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    }
  };

  const isWeekend = (date: string): boolean => {
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };
  
  const renderCommitmentRow = ({ item: commitment }: { item: Commitment }) => (
    <View style={styles.row}>
      <View style={styles.commitmentHeader}>
        <Text style={styles.commitmentTitle} numberOfLines={1}>
          {commitment.title}
        </Text>
        {commitment.streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {commitment.streak}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        {/* Cells are rendered within the shared horizontal ScrollView, so here we just map */}
        <View style={{ flexDirection: 'row' }}>
          {dates.map((date) => {
            const completed = isCompleted(commitment.id, date);
            const isToday = date === todayISO;
            const count = viewMode !== 'daily' ? getCompletionCount(commitment.id, date) : 0;
            return (
              <TouchableOpacity
                key={`${commitment.id}-${date}`}
                style={[
                  styles.cell,
                          completed && { backgroundColor: '#3B82F6' },
                  isToday && viewMode === 'daily' && styles.todayCell,
                ]}
                onPress={() => onCellPress(commitment.id, date)}
              >
                {viewMode === 'daily' ? (
                  completed && <Text style={styles.checkmark}>✓</Text>
                ) : (
                  count > 0 && <Text style={styles.countText}>{count}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
  
  const [scrollX, setScrollX] = useState(0);
  const gridScrollRef = useRef<ScrollView>(null);

  const columnWidth = CELL_SIZE + CELL_MARGIN * 2;
  const visibleRange = useMemo(() => {
    const gridWidth = screenWidth - LEFT_COL_WIDTH;
    const first = Math.max(0, Math.floor(scrollX / columnWidth));
    const count = Math.max(1, Math.ceil(gridWidth / columnWidth));
    const last = Math.min(dates.length - 1, first + count - 1);
    return { first, last };
  }, [scrollX, dates.length]);

  const formatRangeLabel = (startISO: string, endISO: string): string => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();
    if (sameMonth) {
      return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
    }
    if (sameYear) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const renderDateHeader = () => {
    return (
      <View style={{ marginBottom: 4 }}>
        <View style={{ marginBottom: 4 }} />
        <View style={{ flexDirection: 'row' }}>
          {dates.map((date) => {
            const isToday = date === todayISO;
            return (
              <View key={`header-${date}`} style={styles.dateCell}>
                <Text style={styles.dateText}>
                  {formatDateLabel(date)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'daily' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('daily')}
        >
          <Text style={[styles.viewModeText, viewMode === 'daily' && styles.viewModeTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'weekly' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[styles.viewModeText, viewMode === 'weekly' && styles.viewModeTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'monthly' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('monthly')}
        >
          <Text style={[styles.viewModeText, viewMode === 'monthly' && styles.viewModeTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Two-column layout: fixed labels left, synced header+grid right */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left labels column (not horizontally scrollable) */}
        <View style={{ width: LEFT_COL_WIDTH }}>
          {/* Spacer to align with date header height */}
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <View style={{ height: 30, justifyContent: 'center', alignItems: 'flex-start' }}>
              {viewMode === 'daily' && dates.length > 0 && (
                <Text style={styles.dateText}>
                  {formatRangeLabel(dates[visibleRange.first], dates[visibleRange.last])}
                </Text>
              )}
            </View>
          </View>
          {commitments.map((commitment) => (
            <View key={`label-${commitment.id}`} style={[styles.commitmentHeader, { marginBottom: ROW_SPACING, height: CELL_SIZE, paddingTop: 0, paddingBottom: 0 }]}> 
              <Text style={styles.commitmentTitle} numberOfLines={1}>{commitment.title}</Text>
              {commitment.streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {commitment.streak}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Right column: unified horizontal ScrollView with header + grid */}
        <View style={{ flex: 1, position: 'relative' }}>
          <ScrollView
            ref={gridScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: todayIndex * columnWidth, y: 0 }}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setScrollX(x);
            }}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              if (contentOffset.x + layoutMeasurement.width >= contentSize.width - columnWidth * 2) {
                appendFutureDates();
              }
            }}
          >
            <View style={{ position: 'relative' }}>
              {/* Today column highlight bar - positioned within the scrollable content */}
              {viewMode === 'daily' && (
                <View 
                  style={[
                    styles.todayColumnBar,
                    {
                      left: (todayIndex * columnWidth) + (CELL_MARGIN / 4),
                      width: CELL_SIZE + (CELL_MARGIN * 1.5),
                    }
                  ]} 
                  pointerEvents="none"
                />
              )}
              
              {/* Date header */}
              {renderDateHeader()}
              {/* Grid rows */}
              {commitments.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', marginBottom: ROW_SPACING }}>
                  {dates.map((date) => {
                    const completed = isCompleted(c.id, date);
                    const count = viewMode !== 'daily' ? getCompletionCount(c.id, date) : 0;
                    const isWeekendDay = viewMode === 'daily' && isWeekend(date);
                    return (
                      <TouchableOpacity
                        key={`${c.id}-${date}`}
                        style={[
                          styles.cell,
                          isWeekendDay && !completed && styles.weekendCell,
                          completed && { backgroundColor: '#3B82F6' },
                        ]}
                        onPress={() => onCellPress(c.id, date)}
                      >
                        {viewMode === 'daily' ? (
                          completed && <Text style={styles.checkmark}>✓</Text>
                        ) : (
                          count > 0 && <Text style={styles.countText}>{count}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: 'white',
  },
  viewModeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewModeTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  monthHeader: {
    marginBottom: 4,
    paddingLeft: 0,
  },
  monthText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dateCell: {
    width: CELL_SIZE,
    height: 30,
    marginHorizontal: CELL_MARGIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  commitmentHeader: {
    width: 120,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  commitmentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  streakBadge: {
    marginTop: 2,
  },
  streakText: {
    fontSize: 11,
    color: '#DC2626',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginHorizontal: CELL_MARGIN,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekendCell: {
    backgroundColor: '#E5E7EB',
  },
  todayColumnBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
    zIndex: 0,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  countText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});