import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = 44;
const CELL_MARGIN = 2;

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
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function CommitmentGrid({ 
  commitments, 
  records, 
  onCellPress 
}: CommitmentGridProps): React.JSX.Element {
  const scrollRef = useRef<FlatList>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Generate dates based on view mode
  const getDates = () => {
    const dates = [];
    const today = new Date();
    
    if (viewMode === 'daily') {
      // Show last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else if (viewMode === 'weekly') {
      // Show last 12 weeks
      for (let i = 0; i < 12; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
        dates.push(weekStart.toISOString().split('T')[0]);
      }
    } else {
      // Show last 12 months
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
        dates.push(monthStart.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };
  
  const dates = getDates();
  
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
    const d = new Date(date);
    
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
      
      <FlatList
        ref={scrollRef}
        horizontal
        data={dates}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(data, index) => ({
          length: CELL_SIZE + CELL_MARGIN * 2,
          offset: (CELL_SIZE + CELL_MARGIN * 2) * index,
          index,
        })}
        renderItem={({ item: date }) => {
          const completed = isCompleted(commitment.id, date);
          const isToday = date === new Date().toISOString().split('T')[0];
          const count = viewMode !== 'daily' ? getCompletionCount(commitment.id, date) : 0;
          
          return (
            <TouchableOpacity
              style={[
                styles.cell,
                completed && { backgroundColor: commitment.color },
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
        }}
        keyExtractor={(date) => date}
      />
    </View>
  );
  
  const renderDateHeader = () => {
    const currentMonth = viewMode === 'daily' ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    
    return (
      <View>
        {viewMode === 'daily' && (
          <View style={styles.monthHeader}>
            <View style={styles.commitmentHeader} />
            <Text style={styles.monthText}>{currentMonth}</Text>
          </View>
        )}
        <View style={styles.dateHeader}>
          <View style={styles.commitmentHeader} />
          <FlatList
            horizontal
            data={dates}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(data, index) => ({
              length: CELL_SIZE + CELL_MARGIN * 2,
              offset: (CELL_SIZE + CELL_MARGIN * 2) * index,
              index,
            })}
            renderItem={({ item: date }) => {
              const isToday = date === new Date().toISOString().split('T')[0];
              
              return (
                <View style={[styles.dateCell, isToday && viewMode === 'daily' && styles.todayDateCell]}>
                  <Text style={[styles.dateText, isToday && viewMode === 'daily' && styles.todayDateText]}>
                    {formatDateLabel(date)}
                  </Text>
                </View>
              );
            }}
            keyExtractor={(date) => date}
          />
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
      
      {renderDateHeader()}
      <FlatList
        data={commitments}
        renderItem={renderCommitmentRow}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
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
    flexDirection: 'row',
    marginBottom: 4,
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
  todayDateCell: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  todayDateText: {
    fontWeight: 'bold',
    color: '#92400E',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  commitmentHeader: {
    width: 120,
    paddingRight: 12,
  },
  commitmentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
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
  todayCell: {
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  checkmark: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});