import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
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
import CustomCheckmarkIcon from './CustomCheckmarkIcon';
import { SpaciousViewIcon, CompactViewIcon } from './ViewModeIcons';
import CommitmentCellModal from './CommitmentCellModal';
import { useFontStyle } from '@/hooks/useFontStyle';
import { RecordStatus } from '@/store/slices/recordsSlice';
import {
  getTodayISO,
  toLocalISODate,
  parseLocalISODate,
  formatDateForDisplay,
  isWeekend,
  isToday,
  formatDateRangeLabel
} from '@/utils/timeUtils';
import { getCellVisualTreatment, determineCellState } from './grids/gridPalette';
import CellShimmerOverlay from './grids/CellShimmerOverlay';
import { useReduceMotion } from '@/hooks/useReduceMotion';

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

interface CommitmentGridProps {
  commitments: Commitment[];
  records: DayRecord[];
  onCellPress: (commitmentId: string, date: string) => void;
  onSetRecordStatus: (commitmentId: string, date: string, status: RecordStatus, value?: any) => void;
  onCommitmentTitlePress?: (commitmentId: string) => void; // New prop for commitment title clicks
  // Optional hint for the earliest date to display (e.g., account creation date)
  earliestDate?: string; // format YYYY-MM-DD
  // Optional: hide the built-in toggle (for external toggle rendering)
  hideToggle?: boolean;
  // Optional: external viewMode control
  viewMode?: ViewMode;
}

type ViewMode = 'daily' | 'weekly';

export default function CommitmentGrid({ 
  commitments, 
  records, 
  onCellPress,
  onSetRecordStatus,
  onCommitmentTitlePress,
  earliestDate,
  hideToggle = false,
  viewMode: externalViewMode,
}: CommitmentGridProps): React.JSX.Element {
  const fontStyle = useFontStyle();
  const boldFontStyle = useFontStyle(styles.dateTextToday, 'semiBold');
  // const scrollRef = useRef<FlatList>(null); // Unused
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('daily');
  
  // Use external viewMode if provided, otherwise use internal state
  const viewMode = externalViewMode || internalViewMode;
  
  // Reaction popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedCell, setSelectedCell] = useState<{ commitmentId: string; date: string } | null>(null);
  
  // Cell modal state
  const [cellModalVisible, setCellModalVisible] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  
  // Function to animate view mode changes using LayoutAnimation
  const animateToViewMode = (newMode: ViewMode) => {
    // Configure LayoutAnimation for smooth transitions
    LayoutAnimation.configureNext({
      duration: 250,
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
    
    if (externalViewMode) {
      // External viewMode is controlled by parent - no action needed here
      // The parent will handle the state change
    } else {
      setInternalViewMode(newMode);
    }
  };
  
  const [dates, setDates] = useState<string[]>([]);
  const FUTURE_BUFFER_DAYS = 60; // how many future days to pre-render
  
  // Utility - now using centralized time functions

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
    const startISO = earliestDate || minRecordDate || toLocalISODate(today);
    const start = parseLocalISODate(startISO);
    const end = new Date(today);
    end.setDate(end.getDate() + FUTURE_BUFFER_DAYS);
    
    const cursor = new Date(start);
    while (cursor <= end) {
      list.push(toLocalISODate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    
    return list;
  };

  useEffect(() => {
    setDates(buildInitialDates());
  }, [viewMode, earliestDate, minRecordDate, getTodayISO()]);

  const todayISO = getTodayISO();
  const reduceMotion = useReduceMotion();
  const todayIndex = useMemo(() => {
    if (!dates || dates.length === 0) return 0;
    const idx = dates.indexOf(todayISO);
    return idx >= 0 ? idx : 0;
  }, [dates, todayISO]);

  // Extend future dates when reaching the end
  const appendFutureDates = () => {
    if (dates.length === 0) return;
    const last = parseLocalISODate(dates[dates.length - 1]);
    const newDates: string[] = [];
    for (let i = 1; i <= FUTURE_BUFFER_DAYS; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() + i);
      newDates.push(toLocalISODate(d));
    }
    setDates(prev => [...prev, ...newDates]);
  };
  
  
  // Removed getCompletionCount - no aggregation, all cells represent individual days
  
  const formatDateLabel = (date: string): string => {
    return formatDateForDisplay(date, 'day');
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

  const handleCellModalSave = (commitmentId: string, date: string, status: RecordStatus, value?: any) => {
    onSetRecordStatus(commitmentId, date, status, value);
  };

  const handleCellPress = (commitmentId: string, date: string) => {
    const commitment = commitments.find(c => c.id === commitmentId);
    if (!commitment) return;

    // For binary commitments (Yes/No type), use the original simple toggle behavior
    if (commitment.commitmentType === 'checkbox' && !commitment.requirements) {
      onCellPress(commitmentId, date);
      return;
    }

    // For non-binary commitments (Multiple Requirements, Rating, Measure), open the cell modal
    setSelectedCommitment(commitment);
    setSelectedDate(date);
    setCellModalVisible(true);
  };

  const handlePopupDismiss = () => {
    setPopupVisible(false);
    setSelectedCell(null);
  };
  
  // Unused function - removed to fix TypeScript errors
  
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

  // Using centralized formatDateRangeLabel function

  const renderDateHeader = () => {
    return (
      <View style={{ marginBottom: 4 }}>
        <View style={{ marginBottom: 4 }} />
        <View style={{ flexDirection: 'row' }}>
          {dates.map((date, index) => {
            const isTodayHeader = isToday(date);
            const textStyle = isTodayHeader
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
  };

  return (
    <View style={styles.container}>
      {/* Compact View Mode Toggle - only show if not hidden */}
      {!hideToggle && (
        <View style={styles.compactToggleContainer}>
          {/* Animated sliding background */}
          <View 
            style={[
              styles.toggleSlider,
              viewMode === 'weekly' && styles.toggleSliderRight
            ]} 
          />
          
          {/* Left icon positioned to match slider left position */}
          <TouchableOpacity
            style={styles.iconButtonLeft}
            onPress={() => animateToViewMode('daily')}
          >
            <SpaciousViewIcon size={16} isActive={viewMode === 'daily'} />
          </TouchableOpacity>
          
          {/* Right icon positioned to match slider right position */}
          <TouchableOpacity
            style={styles.iconButtonRight}
            onPress={() => animateToViewMode('weekly')}
          >
            <CompactViewIcon size={16} isActive={viewMode === 'weekly'} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Two-column layout: fixed labels left, synced header+grid right */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left labels column (not horizontally scrollable) */}
        <View style={{ width: getLeftColWidth(viewMode) }}>
          {/* Spacer to align with date header height */}
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <View style={{ height: 30, justifyContent: 'center', alignItems: 'flex-start' }}>
              {dates.length > 0 && (
                <Text style={[styles.dateText, fontStyle, { textTransform: 'uppercase' }]}>
                  {formatDateRangeLabel(dates[visibleRange.first], dates[visibleRange.last])}
                </Text>
              )}
            </View>
          </View>
          {commitments.map((commitment) => (
            <TouchableOpacity 
              key={`label-${commitment.id}`} 
              style={[dynamicStyles.commitmentHeader, { marginBottom: getRowSpacing(viewMode), height: getCellSize(viewMode), paddingTop: 0, paddingBottom: 0 }]}
              onPress={() => onCommitmentTitlePress?.(commitment.id)}
              disabled={!onCommitmentTitlePress}
            > 
              <Text style={[styles.commitmentTitle, fontStyle]} numberOfLines={1}>{commitment.title}</Text>
            </TouchableOpacity>
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
              {/* Today column highlight bar removed by design */}
              
              {/* Date header */}
              {renderDateHeader()}
              {/* Grid rows */}
              {commitments.map((c, rowIndex) => (
                <View key={c.id} style={{ flexDirection: 'row', marginBottom: getRowSpacing(viewMode) }}>
                  {dates.map((date) => {
                    const record = records.find(r => r.commitmentId === c.id && r.date === date);
                    const status = record?.status || 'none';
                    const isWeekendDay = isWeekend(date);
                    const isTodayDate = date === todayISO;

                    // Determine cell state and visual treatment using centralized palette
                    const cellState = determineCellState(status, isWeekendDay, isTodayDate);
                    const visualTreatment = getCellVisualTreatment(cellState);

                    const cellSize = getCellSize(viewMode);
                    const cellRadius = getCellBorderRadius(viewMode);

                    // Create dynamic cell style
                    const cellStyleOverrides = {
                      backgroundColor: visualTreatment.backgroundColor,
                      borderWidth: visualTreatment.borderWidth,
                      borderColor: visualTreatment.borderColor,
                    };

                    const cellStyle = [dynamicStyles.cell, cellStyleOverrides];
                    let cellContent = null;

                    if (status === 'completed') {
                      cellContent = <CustomCheckmarkIcon size={12.32} color="white" strokeWidth={2.2} />;
                    } else if (status === 'failed') {
                      cellContent = <CustomXIcon size={10} color="white" strokeWidth={2.5} />;
                    }
                    // skipped cells have no content (empty colored square)
                    
                    return (
                      <TouchableOpacity
                        key={`${c.id}-${date}`}
                        style={cellStyle}
                        onPress={() => handleCellPress(c.id, date)}
                        onLongPress={(event) => handleLongPress(c.id, date, event)}
                        delayLongPress={500}
                      >
                        {cellContent}
                        <CellShimmerOverlay
                          size={cellSize}
                          radius={cellRadius}
                          rowIndex={rowIndex}
                          isToday={isTodayDate}
                          isVisible={true}
                          reduceMotion={reduceMotion}
                        />
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

      {/* Cell Modal for Non-Binary Commitments */}
      <CommitmentCellModal
        visible={cellModalVisible}
        onClose={() => setCellModalVisible(false)}
        commitment={selectedCommitment}
        date={selectedDate}
        existingRecord={selectedCommitment ? records.find(r => 
          r.commitmentId === selectedCommitment.id && r.date === selectedDate
        ) : null}
        onSave={handleCellModalSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactToggleContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginRight: 0, // Align with other right edges
    backgroundColor: '#F3F4F6',
    borderRadius: 16, // Slightly less rounded for lower height
    padding: 2,
    width: 84, // 50% wider (56 * 1.5)
    height: 28, // Reduced height
  },
  toggleSlider: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 40, // Half of container width minus padding
    height: 24, // Container height minus padding
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSliderRight: {
    left: 42, // Move to right position with proper spacing
  },
  iconButtonLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 40, // Match slider width
    height: 24, // Match slider height
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // Above the slider
  },
  iconButtonRight: {
    position: 'absolute',
    top: 2,
    left: 42, // Match slider right position
    width: 40, // Match slider width
    height: 24, // Match slider height
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // Above the slider
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
    lineHeight: 16,
  },
  dateTextToday: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 16,
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
  // Cell colors now managed by centralized grid palette
  // Today column highlight removed by design
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