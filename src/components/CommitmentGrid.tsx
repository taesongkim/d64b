import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import ReactionPopup from './ReactionPopup';
import CustomXIcon from './CustomXIcon';
import CustomSkipIcon from './CustomSkipIcon';
import CustomCheckmarkIcon from './CustomCheckmarkIcon';
import { useFontStyle } from '@/hooks/useFontStyle';
import { RecordStatus } from '@/store/slices/recordsSlice';

const { width: screenWidth } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Dynamic sizing based on view mode (zoom out effect)
const getCellSize = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 28;
    case 'weekly': return 18; // Smaller to fit 4-5 weeks (28-35 days)
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

const getLeftColWidth = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 120;
    case 'weekly': return 100;
    default: return 120;
  }
};

const getRowSpacing = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 4;
    case 'weekly': return 2;
    default: return 4;
  }
};

const getCellBorderRadius = (mode: ViewMode) => {
  switch (mode) {
    case 'daily': return 4; // 28px cell
    case 'weekly': return 3; // 18px cell
    default: return 4;
  }
};

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
  status: RecordStatus;
  value?: number;
}

interface CommitmentGridProps {
  commitments: Commitment[];
  records: DayRecord[];
  onCellPress: (commitmentId: string, date: string) => void;
  onSetRecordStatus: (commitmentId: string, date: string, status: RecordStatus) => void;
  // Optional hint for the earliest date to display (e.g., account creation date)
  earliestDate?: string; // format YYYY-MM-DD
}

type ViewMode = 'daily' | 'weekly';

export default function CommitmentGrid({ 
  commitments, 
  records, 
  onCellPress,
  onSetRecordStatus,
  earliestDate,
}: CommitmentGridProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const scrollRef = useRef<FlatList>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Reaction popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<{ commitmentId: string; date: string } | null>(null);
  
  // Function to animate view mode changes using LayoutAnimation
  const animateToViewMode = (newMode: ViewMode) => {
    // Configure LayoutAnimation for smooth transitions
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    
    setViewMode(newMode);
  };
  
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
    
    // All views show individual daily cells - just different sizes
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
    if (dates.length === 0) return;
    const last = new Date(dates[dates.length - 1]);
    const newDates: string[] = [];
    for (let i = 1; i <= FUTURE_BUFFER_DAYS; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() + i);
      newDates.push(toISODate(d));
    }
    setDates(prev => [...prev, ...newDates]);
  };
  
  
  // Removed getCompletionCount - no aggregation, all cells represent individual days
  
  const formatDateLabel = (date: string): string => {
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // month is 0-indexed
    
    // All views show individual daily cells - show day of month
    return d.getDate().toString();
  };

  const isWeekend = (date: string): boolean => {
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  // Popup handlers
  const handleLongPress = (commitmentId: string, date: string, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedCell({ commitmentId, date });
    setPopupPosition({ x: pageX, y: pageY });
    setPopupVisible(true);
  };

  const handlePopupSelect = (status: RecordStatus) => {
    if (selectedCell) {
      onSetRecordStatus(selectedCell.commitmentId, selectedCell.date, status);
    }
  };

  const handlePopupDismiss = () => {
    setPopupVisible(false);
    setSelectedCell(null);
  };
  
  const renderCommitmentRow = ({ item: commitment }: { item: Commitment }) => (
    <View style={styles.row}>
      <View style={dynamicStyles.commitmentHeader}>
        <Text style={[styles.commitmentTitle, fontStyle, { textTransform: 'uppercase' }]} numberOfLines={1}>
          {commitment.title}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {/* Cells are rendered within the shared horizontal ScrollView, so here we just map */}
        <View style={{ flexDirection: 'row' }}>
          {dates.map((date) => {
            const record = records.find(r => r.commitmentId === commitment.id && r.date === date);
            const status = record?.status || 'none';
            const isToday = date === todayISO;
            const isWeekendDay = isWeekend(date);
            
            // Determine cell styling based on status
            let cellStyle = [dynamicStyles.cell];
            let cellContent = null;
            
            if (status === 'completed') {
              cellStyle.push({ backgroundColor: '#3B82F6' });
              cellContent = <CustomCheckmarkIcon />;
            } else if (status === 'skipped') {
              cellStyle.push({ backgroundColor: '#3B82F6' });
              cellContent = <CustomSkipIcon size={12} color="white" />;
            } else if (status === 'failed') {
              cellStyle.push({ backgroundColor: '#EF4444' });
              cellContent = <CustomXIcon size={10} color="white" strokeWidth={2.5} />;
            } else if (isWeekendDay) {
              cellStyle.push(styles.weekendCell);
            }
            
            if (isToday) {
              cellStyle.push(styles.todayCell);
            }
            
            return (
              <TouchableOpacity
                key={`${commitment.id}-${date}`}
                style={cellStyle}
                onPress={() => onCellPress(commitment.id, date)}
                onLongPress={(event) => handleLongPress(commitment.id, date, event)}
                delayLongPress={500}
              >
                {cellContent}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
  
  const [scrollX, setScrollX] = useState(0);
  const gridScrollRef = useRef<ScrollView>(null);

  // Calculate column width based on current view mode
  const columnWidth = getCellSize(viewMode) + getCellMargin(viewMode) * 2;
  
  // Dynamic styles based on current view mode
  const dynamicStyles = {
    dateCell: {
      width: getCellSize(viewMode),
      height: 30,
      marginHorizontal: getCellMargin(viewMode),
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    cell: {
      width: getCellSize(viewMode),
      height: getCellSize(viewMode),
      marginHorizontal: getCellMargin(viewMode),
      borderRadius: getCellBorderRadius(viewMode),
      backgroundColor: '#F3F4F6',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    commitmentHeader: {
      width: getLeftColWidth(viewMode),
      paddingRight: 12,
      justifyContent: 'center' as const,
      alignItems: 'flex-start' as const,
    },
  };
  const visibleRange = useMemo(() => {
    const gridWidth = screenWidth - getLeftColWidth(viewMode);
    const first = Math.max(0, Math.floor(scrollX / columnWidth));
    const count = Math.max(1, Math.ceil(gridWidth / columnWidth));
    const last = Math.min(dates.length - 1, first + count - 1);
    return { first, last };
  }, [scrollX, dates.length, viewMode, columnWidth]);

  const formatRangeLabel = (startISO: string, endISO: string): string => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    
    if (sameMonth) {
      // Same month: "Jan 2024"
      return `${s.toLocaleDateString('en-US', { month: 'short' })} ${e.getFullYear()}`;
    } else {
      // Different months: "Jan-Feb 2024" or "Dec-Jan 2025"
      const startMonth = s.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = e.toLocaleDateString('en-US', { month: 'short' });
      return `${startMonth}-${endMonth} ${e.getFullYear()}`;
    }
  };

  const renderDateHeader = () => {
    return (
      <View style={{ marginBottom: 4 }}>
        <View style={{ marginBottom: 4 }} />
        <View style={{ flexDirection: 'row' }}>
          {dates.map((date, index) => {
            const isToday = date === todayISO;
            return (
              <View key={`header-${date}-${index}`} style={dynamicStyles.dateCell}>
                <Text style={[styles.dateText, fontStyle]}>
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
          onPress={() => animateToViewMode('daily')}
        >
          <Text style={[styles.viewModeText, viewMode === 'daily' && styles.viewModeTextActive, fontStyle]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'weekly' && styles.viewModeButtonActive]}
          onPress={() => animateToViewMode('weekly')}
        >
          <Text style={[styles.viewModeText, viewMode === 'weekly' && styles.viewModeTextActive, fontStyle]}>
            Biweekly
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Two-column layout: fixed labels left, synced header+grid right */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left labels column (not horizontally scrollable) */}
        <View style={{ width: getLeftColWidth(viewMode) }}>
          {/* Spacer to align with date header height */}
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <View style={{ height: 30, justifyContent: 'center', alignItems: 'flex-start' }}>
              {dates.length > 0 && (
                <Text style={[styles.dateText, fontStyle]}>
                  {formatRangeLabel(dates[visibleRange.first], dates[visibleRange.last])}
                </Text>
              )}
            </View>
          </View>
          {commitments.map((commitment) => (
            <View key={`label-${commitment.id}`} style={[dynamicStyles.commitmentHeader, { marginBottom: getRowSpacing(viewMode), height: getCellSize(viewMode), paddingTop: 0, paddingBottom: 0 }]}> 
              <Text style={[styles.commitmentTitle, fontStyle, { textTransform: 'uppercase' }]} numberOfLines={1}>{commitment.title}</Text>
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
              <View 
                  style={[
                    styles.todayColumnBar,
                    {
                      left: (todayIndex * (getCellSize(viewMode) + getCellMargin(viewMode) * 2)) + (getCellMargin(viewMode) / 4),
                      width: getCellSize(viewMode) + (getCellMargin(viewMode) * 1.5),
                      borderRadius: getCellBorderRadius(viewMode),
                    }
                  ]} 
                  pointerEvents="none"
                />
              
              {/* Date header */}
              {renderDateHeader()}
              {/* Grid rows */}
              {commitments.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', marginBottom: getRowSpacing(viewMode) }}>
                  {dates.map((date) => {
                    const record = records.find(r => r.commitmentId === c.id && r.date === date);
                    const status = record?.status || 'none';
                    const isWeekendDay = isWeekend(date);
                    
                    // Determine cell styling based on status
                    let cellStyle = [dynamicStyles.cell];
                    let cellContent = null;
                    
                    if (status === 'completed') {
                      cellStyle.push({ backgroundColor: '#3B82F6' });
                      cellContent = <CustomCheckmarkIcon />;
                    } else if (status === 'skipped') {
                      cellStyle.push({ backgroundColor: '#3B82F6' });
                      cellContent = <CustomSkipIcon size={12} color="white" />;
                    } else if (status === 'failed') {
                      cellStyle.push({ backgroundColor: '#EF4444' });
                      cellContent = <CustomXIcon size={10} color="white" strokeWidth={2.5} />;
                    } else if (isWeekendDay) {
                      cellStyle.push(styles.weekendCell);
                    }
                    
                    return (
                      <TouchableOpacity
                        key={`${c.id}-${date}`}
                        style={cellStyle}
                        onPress={() => onCellPress(c.id, date)}
                        onLongPress={(event) => handleLongPress(c.id, date, event)}
                        delayLongPress={500}
                      >
                        {cellContent}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
      
      {/* Reaction Popup */}
      <ReactionPopup
        visible={popupVisible}
        onSelect={handlePopupSelect}
        onDismiss={handlePopupDismiss}
        position={popupPosition}
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
    fontFamily: 'Manrope_500Medium',
  },
  viewModeTextActive: {
    color: '#111827',
    fontFamily: 'Manrope_600SemiBold',
  },
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
  dateHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  dateCell: {
    height: 30,
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
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  commitmentTitle: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  cell: {
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
    zIndex: 0,
  },
  skipMark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  failMark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  countText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
  },
});