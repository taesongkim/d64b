import React, { useRef } from 'react';
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

export default function CommitmentGrid({ 
  commitments, 
  records, 
  onCellPress 
}: CommitmentGridProps): React.JSX.Element {
  const scrollRef = useRef<FlatList>(null);
  
  // Generate last 30 days
  const getDates = () => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };
  
  const dates = getDates();
  
  const isCompleted = (commitmentId: string, date: string): boolean => {
    return records.some(
      r => r.commitmentId === commitmentId && r.date === date && r.completed
    );
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
        initialScrollIndex={dates.length - 7}
        getItemLayout={(data, index) => ({
          length: CELL_SIZE + CELL_MARGIN * 2,
          offset: (CELL_SIZE + CELL_MARGIN * 2) * index,
          index,
        })}
        renderItem={({ item: date }) => {
          const completed = isCompleted(commitment.id, date);
          const isToday = date === new Date().toISOString().split('T')[0];
          
          return (
            <TouchableOpacity
              style={[
                styles.cell,
                completed && { backgroundColor: commitment.color },
                isToday && styles.todayCell,
              ]}
              onPress={() => onCellPress(commitment.id, date)}
            >
              {completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        keyExtractor={(date) => date}
      />
    </View>
  );
  
  const renderDateHeader = () => (
    <View style={styles.dateHeader}>
      <View style={styles.commitmentHeader} />
      <FlatList
        horizontal
        data={dates}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={dates.length - 7}
        getItemLayout={(data, index) => ({
          length: CELL_SIZE + CELL_MARGIN * 2,
          offset: (CELL_SIZE + CELL_MARGIN * 2) * index,
          index,
        })}
        renderItem={({ item: date }) => {
          const day = new Date(date).getDate();
          const isToday = date === new Date().toISOString().split('T')[0];
          
          return (
            <View style={[styles.dateCell, isToday && styles.todayDateCell]}>
              <Text style={[styles.dateText, isToday && styles.todayDateText]}>
                {day}
              </Text>
            </View>
          );
        }}
        keyExtractor={(date) => date}
      />
    </View>
  );

  return (
    <View style={styles.container}>
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
});