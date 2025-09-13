import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAppSelector } from '@/store/hooks';
import { StreakCalculator } from '@/utils/streakCalculation';
import { HapticService } from '@/services/hapticService';
import { generateDateRange, formatDateForDisplay } from '@/utils/timeUtils';

const screenWidth = Dimensions.get('window').width;

interface TimeRange {
  key: string;
  label: string;
  days: number;
}

const TIME_RANGES: TimeRange[] = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: '1y', label: '1 Year', days: 365 },
];

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
};

export default function AnalyticsScreen(): React.JSX.Element {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES[1]); // Default to 30 days
  const commitments = useAppSelector(state => state.commitments.commitments);
  const records = useAppSelector(state => state.records.records);

  // Generate date range for analysis
  const dateRange = useMemo(() => {
    return generateDateRange(selectedRange.days);
  }, [selectedRange.days]);

  // Calculate daily completion rates
  const dailyCompletionData = useMemo(() => {
    const data = dateRange.map(date => {
      const dayRecords = records.filter(r => r.date === date && r.status === 'completed');
      const completionRate = commitments.length > 0 ? (dayRecords.length / commitments.length) * 100 : 0;
      return completionRate;
    });

    return {
      labels: dateRange.map(date => formatDateForDisplay(date, 'short')),
      datasets: [{
        data: data,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      }],
    };
  }, [dateRange, records, commitments]);

  // Calculate habit performance
  const habitPerformanceData = useMemo(() => {
    if (commitments.length === 0) return null;

    const habitData = commitments.map(commitment => {
      const habitRecords = records.filter(r => 
        r.commitmentId === commitment.id && 
        dateRange.includes(r.date) && 
        r.status === 'completed'
      );
      
      return {
        name: commitment.title.length > 10 ? 
          commitment.title.substring(0, 10) + '...' : 
          commitment.title,
        population: habitRecords.length,
        color: commitment.color,
        legendFontColor: '#374151',
        legendFontSize: 12,
      };
    });

    return habitData.filter(item => item.population > 0);
  }, [commitments, records, dateRange]);

  // Calculate weekly completion bars
  const weeklyCompletionData = useMemo(() => {
    if (selectedRange.days < 7) return null;

    const weeks: string[] = [];
    const completions: number[] = [];
    
    // Group dates into weeks
    for (let i = 0; i < dateRange.length; i += 7) {
      const weekDates = dateRange.slice(i, i + 7);
      const weekStart = new Date(weekDates[0]);
      const weekEnd = new Date(weekDates[weekDates.length - 1]);
      
      weeks.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
      
      const weekRecords = records.filter(r => 
        weekDates.includes(r.date) && r.status === 'completed'
      );
      
      completions.push(weekRecords.length);
    }

    return {
      labels: weeks,
      datasets: [{
        data: completions,
      }],
    };
  }, [dateRange, records, selectedRange.days]);

  // Calculate daily activity patterns
  const dailyActivityPattern = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCompletions: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];

    dateRange.forEach(date => {
      const dayOfWeek = new Date(date).getDay();
      dayCounts[dayOfWeek]++;
      
      const dayRecords = records.filter(r => r.date === date && r.status === 'completed');
      dayCompletions[dayOfWeek] += dayRecords.length;
    });

    return {
      labels: dayNames.map(name => name.substring(0, 3)), // Mon, Tue, etc.
      datasets: [{
        data: dayCompletions.map((completions, index) => 
          dayCounts[index] > 0 ? Math.round((completions / dayCounts[index]) * 10) / 10 : 0
        ),
      }],
    };
  }, [dateRange, records]);

  // Calculate weekly activity summaries
  const weeklyActivitySummary = useMemo(() => {
    if (selectedRange.days < 7) return null;

    const weeks = [];
    for (let i = 0; i < dateRange.length; i += 7) {
      const weekDates = dateRange.slice(i, i + 7);
      const weekStart = new Date(weekDates[0]);
      const weekEnd = new Date(weekDates[weekDates.length - 1]);
      
      const weekRecords = records.filter(r => 
        weekDates.includes(r.date) && r.status === 'completed'
      );

      const activeDays = weekDates.filter(date => 
        records.some(r => r.date === date && r.status === 'completed')
      ).length;

      const possibleCompletions = commitments.length * weekDates.length;
      const actualCompletions = weekRecords.length;
      const completionRate = possibleCompletions > 0 ? 
        Math.round((actualCompletions / possibleCompletions) * 100) : 0;

      weeks.push({
        weekLabel: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        activeDays,
        totalCompletions: actualCompletions,
        completionRate,
        daysInWeek: weekDates.length,
      });
    }

    return weeks.reverse(); // Show most recent first
  }, [dateRange, records, commitments, selectedRange.days]);

  // Calculate activity heatmap data
  const activityHeatmapData = useMemo(() => {
    return dateRange.map(date => {
      const dayRecords = records.filter(r => r.date === date && r.status === 'completed');
      const completionRate = commitments.length > 0 ? 
        (dayRecords.length / commitments.length) : 0;
      
      return {
        date,
        completions: dayRecords.length,
        completionRate,
        intensity: Math.min(Math.floor(completionRate * 4), 3), // 0-3 intensity levels
        dayOfWeek: new Date(date).getDay(),
        dayOfMonth: new Date(date).getDate(),
      };
    });
  }, [dateRange, records, commitments]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalPossibleCompletions = commitments.length * dateRange.length;
    const actualCompletions = records.filter(r => 
      dateRange.includes(r.date) && r.status === 'completed'
    ).length;
    
    const overallRate = totalPossibleCompletions > 0 ? 
      (actualCompletions / totalPossibleCompletions) * 100 : 0;

    // Calculate current streaks
    const streaks = commitments.map(commitment => {
      const streakData = StreakCalculator.calculateStreakData(commitment.id, records);
      return streakData.currentStreak;
    });

    const avgStreak = streaks.length > 0 ? 
      streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
    const bestStreak = Math.max(...streaks, 0);

    // Calculate consistency (days with at least one completion)
    const daysWithCompletions = dateRange.filter(date => 
      records.some(r => r.date === date && r.completed)
    ).length;
    
    const consistency = dateRange.length > 0 ? 
      (daysWithCompletions / dateRange.length) * 100 : 0;

    return {
      overallRate: Math.round(overallRate),
      avgStreak: Math.round(avgStreak * 10) / 10,
      bestStreak,
      consistency: Math.round(consistency),
      totalCompletions: actualCompletions,
    };
  }, [commitments, records, dateRange]);

  const handleTimeRangeSelect = (range: TimeRange) => {
    HapticService.selection();
    setSelectedRange(range);
  };

  const handleExportAnalytics = async () => {
    try {
      HapticService.selection();
      
      const exportData = `📊 My Habit Analytics - ${selectedRange.label}

📈 Overall Performance:
• Completion Rate: ${overallStats.overallRate}%
• Average Streak: ${overallStats.avgStreak} days
• Best Streak: ${overallStats.bestStreak} days
• Consistency: ${overallStats.consistency}% of days active
• Total Completions: ${overallStats.totalCompletions}

🎯 Active Habits: ${commitments.length}
📅 Analysis Period: ${selectedRange.label} (${dateRange[0]} to ${dateRange[dateRange.length - 1]})

${overallStats.overallRate >= 80 ? '🎉 Excellent progress! Keep up the great work!' : 
  overallStats.overallRate >= 60 ? '📈 Good momentum! Room for improvement.' : 
  '💪 Every day is a new opportunity to build better habits!'}

Generated by D64B Habit Tracker`;

      await Share.share({
        message: exportData,
        title: 'My Habit Analytics',
      });
    } catch (error) {
      Alert.alert('Export Error', 'Unable to share analytics data');
    }
  };

  const StatCard = ({ title, value, subtitle, color = '#111827' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header with Export */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Analytics</Text>
              <Text style={styles.headerSubtitle}>Track your progress over time</Text>
            </View>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportAnalytics}
            >
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics Period</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeRangeContainer}
          >
            {TIME_RANGES.map(range => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.timeRangeButton,
                  selectedRange.key === range.key && styles.selectedTimeRange
                ]}
                onPress={() => handleTimeRangeSelect(range)}
              >
                <Text style={[
                  styles.timeRangeText,
                  selectedRange.key === range.key && styles.selectedTimeRangeText
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Overall Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              title="Overall Rate"
              value={`${overallStats.overallRate}%`}
              subtitle="Completion rate"
            />
            <StatCard 
              title="Average Streak"
              value={overallStats.avgStreak}
              subtitle="Days"
            />
            <StatCard 
              title="Best Streak"
              value={overallStats.bestStreak}
              subtitle="Days"
            />
            <StatCard 
              title="Consistency"
              value={`${overallStats.consistency}%`}
              subtitle="Active days"
            />
          </View>
        </View>

        {/* Daily Completion Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Completion Rate</Text>
          <View style={styles.chartContainer}>
            {dailyCompletionData.datasets[0].data.some(val => val > 0) ? (
              <LineChart
                data={dailyCompletionData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots={true}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                suffix="%"
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No completion data available</Text>
                <Text style={styles.noDataSubtext}>Start completing habits to see trends</Text>
              </View>
            )}
          </View>
        </View>

        {/* Activity Heatmap */}
        {selectedRange.days >= 30 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Heatmap</Text>
            <Text style={styles.sectionSubtitle}>Daily completion intensity over time</Text>
            <View style={styles.heatmapContainer}>
              <View style={styles.heatmapGrid}>
                {activityHeatmapData.map((day, index) => (
                  <TouchableOpacity 
                    key={day.date}
                    style={[
                      styles.heatmapCell,
                      styles[`intensity${day.intensity}`]
                    ]}
                    onPress={() => {
                      HapticService.selection();
                      Alert.alert(
                        `${formatDateForDisplay(day.date, 'full')}`,
                        `${day.completions} completions\n${Math.round(day.completionRate * 100)}% completion rate`
                      );
                    }}
                  >
                    <Text style={styles.heatmapCellText}>{day.dayOfMonth}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.heatmapLegend}>
                <Text style={styles.heatmapLegendText}>Less</Text>
                <View style={styles.heatmapLegendScale}>
                  <View style={[styles.heatmapLegendCell, styles.intensity0]} />
                  <View style={[styles.heatmapLegendCell, styles.intensity1]} />
                  <View style={[styles.heatmapLegendCell, styles.intensity2]} />
                  <View style={[styles.heatmapLegendCell, styles.intensity3]} />
                </View>
                <Text style={styles.heatmapLegendText}>More</Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Activity Patterns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Activity Pattern</Text>
          <Text style={styles.sectionSubtitle}>Average completions by day of week</Text>
          <View style={styles.chartContainer}>
            {dailyActivityPattern.datasets[0].data.some(val => val > 0) ? (
              <BarChart
                data={dailyActivityPattern}
                width={screenWidth - 40}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                withInnerLines={false}
                fromZero={true}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No daily pattern data available</Text>
                <Text style={styles.noDataSubtext}>Complete habits to see your daily patterns</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Completions */}
        {weeklyCompletionData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <Text style={styles.sectionSubtitle}>Total completions per week</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={weeklyCompletionData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                withInnerLines={false}
              />
            </View>
          </View>
        )}

        {/* Weekly Activity Summary */}
        {weeklyActivitySummary && weeklyActivitySummary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            <Text style={styles.sectionSubtitle}>Detailed breakdown by week</Text>
            <View style={styles.weeklyListContainer}>
              {weeklyActivitySummary.slice(0, 4).map((week, index) => (
                <View key={index} style={styles.weeklyCard}>
                  <View style={styles.weeklyCardHeader}>
                    <Text style={styles.weeklyCardTitle}>{week.weekLabel}</Text>
                    <Text style={[
                      styles.weeklyCardRate,
                      week.completionRate >= 80 ? styles.successRate :
                      week.completionRate >= 60 ? styles.warningRate :
                      styles.errorRate
                    ]}>
                      {week.completionRate}%
                    </Text>
                  </View>
                  <View style={styles.weeklyCardStats}>
                    <View style={styles.weeklyStatItem}>
                      <Text style={styles.weeklyStatLabel}>Active Days</Text>
                      <Text style={styles.weeklyStatValue}>{week.activeDays}/{week.daysInWeek}</Text>
                    </View>
                    <View style={styles.weeklyStatItem}>
                      <Text style={styles.weeklyStatLabel}>Completions</Text>
                      <Text style={styles.weeklyStatValue}>{week.totalCompletions}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Habit Performance Distribution */}
        {habitPerformanceData && habitPerformanceData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habit Performance</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={habitPerformanceData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {overallStats.overallRate >= 80 && (
              <View style={[styles.insightCard, styles.successInsight]}>
                <Text style={styles.insightTitle}>🎉 Excellent Progress!</Text>
                <Text style={styles.insightText}>
                  You're maintaining an {overallStats.overallRate}% completion rate. Keep up the great work!
                </Text>
              </View>
            )}
            
            {overallStats.bestStreak >= 7 && (
              <View style={[styles.insightCard, styles.infoInsight]}>
                <Text style={styles.insightTitle}>🔥 Streak Master</Text>
                <Text style={styles.insightText}>
                  Your best streak is {overallStats.bestStreak} days. Consistency is key to building lasting habits!
                </Text>
              </View>
            )}
            
            {overallStats.overallRate < 50 && commitments.length > 0 && (
              <View style={[styles.insightCard, styles.warningInsight]}>
                <Text style={styles.insightTitle}>💡 Room for Improvement</Text>
                <Text style={styles.insightText}>
                  Your completion rate is {overallStats.overallRate}%. Consider focusing on fewer habits to build stronger routines.
                </Text>
              </View>
            )}
            
            {commitments.length === 0 && (
              <View style={[styles.insightCard, styles.infoInsight]}>
                <Text style={styles.insightTitle}>🚀 Get Started</Text>
                <Text style={styles.insightText}>
                  Add your first habit from the Dashboard to start tracking your progress!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Space */}
        <View style={styles.footer} />
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  exportButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  timeRangeContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTimeRange: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#374151',
  },
  selectedTimeRangeText: {
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#374151',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  successInsight: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#22C55E',
  },
  infoInsight: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  warningInsight: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  weeklyListContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  weeklyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weeklyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyCardTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  weeklyCardRate: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
  },
  successRate: {
    color: '#22C55E',
  },
  warningRate: {
    color: '#F59E0B',
  },
  errorRate: {
    color: '#EF4444',
  },
  weeklyCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyStatItem: {
    alignItems: 'center',
  },
  weeklyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  weeklyStatValue: {
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  heatmapContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 16,
  },
  heatmapCell: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heatmapCellText: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
  },
  intensity0: {
    backgroundColor: '#F9FAFB',
  },
  intensity1: {
    backgroundColor: '#DCFCE7',
  },
  intensity2: {
    backgroundColor: '#BBF7D0',
  },
  intensity3: {
    backgroundColor: '#22C55E',
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heatmapLegendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  heatmapLegendScale: {
    flexDirection: 'row',
    gap: 2,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  footer: {
    height: 20,
  },
});