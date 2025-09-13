import { DayRecord } from '@/store/slices/recordsSlice';
import { getTodayISO, toLocalISODate, parseLocalISODate } from './timeUtils';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number; // Over last 30 days
  lastCompletionDate?: string;
}

export class StreakCalculator {
  /**
   * Calculate comprehensive streak data for a commitment
   */
  static calculateStreakData(
    commitmentId: string, 
    records: DayRecord[], 
    daysToAnalyze: number = 30
  ): StreakData {
    const commitmentRecords = records
      .filter(record => record.commitmentId === commitmentId && record.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (commitmentRecords.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
      };
    }

    const todayISO = getTodayISO();
    const today = parseLocalISODate(todayISO);

    // Calculate current streak
    let currentStreak = 0;
    let currentDate = new Date(today);

    // Check if today is completed
    const todayRecord = commitmentRecords.find(
      record => record.date === todayISO
    );

    // Start checking from today if completed, otherwise yesterday
    if (!todayRecord) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    const oneYearAgo = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
    while (currentDate.getTime() >= oneYearAgo.getTime()) {
      const dateStr = toLocalISODate(currentDate);
      const record = records.find(r => r.commitmentId === commitmentId && r.date === dateStr);
      
      if (record) {
        if (record.status === 'completed') {
          currentStreak++;
        } else if (record.status === 'failed') {
          // Failed days break the streak
          break;
        } else if (record.status === 'skipped') {
          // Skipped days don't affect the streak, continue checking
          // Don't increment streak, but don't break it either
        } else {
          // No record or 'none' status - break the streak
          break;
        }
      } else {
        // No record for this date - break the streak
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate best streak
    const bestStreak = this.calculateBestStreak(commitmentRecords);

    // Calculate completion rate over specified days
    const startAnalysisDate = new Date(today);
    startAnalysisDate.setDate(startAnalysisDate.getDate() - daysToAnalyze);
    
    const recentRecords = commitmentRecords.filter(
      record => new Date(record.date) >= startAnalysisDate
    );
    
    const completionRate = recentRecords.length > 0 
      ? Math.round((recentRecords.length / daysToAnalyze) * 100) 
      : 0;

    return {
      currentStreak,
      bestStreak,
      totalCompletions: commitmentRecords.length,
      completionRate,
      lastCompletionDate: commitmentRecords[0]?.date,
    };
  }

  /**
   * Calculate the best streak from historical data
   */
  private static calculateBestStreak(sortedRecords: DayRecord[]): number {
    if (sortedRecords.length === 0) return 0;

    let bestStreak = 0;
    let currentBestStreak = 1;
    
    // Convert dates to timestamps for easier comparison
    const recordDates = sortedRecords
      .map(record => new Date(record.date).getTime())
      .sort((a, b) => a - b); // Sort ascending for streak calculation

    for (let i = 1; i < recordDates.length; i++) {
      const currentDate = recordDates[i];
      const previousDate = recordDates[i - 1];
      const daysDifference = (currentDate - previousDate) / (24 * 60 * 60 * 1000);

      if (daysDifference === 1) {
        // Consecutive day
        currentBestStreak++;
      } else {
        // Gap in streak
        bestStreak = Math.max(bestStreak, currentBestStreak);
        currentBestStreak = 1;
      }
    }

    return Math.max(bestStreak, currentBestStreak);
  }

  /**
   * Get streak status message
   */
  static getStreakMessage(streakData: StreakData): string {
    if (streakData.currentStreak === 0) {
      return 'Start your streak today!';
    }

    if (streakData.currentStreak === 1) {
      return 'Great start! Keep it going.';
    }

    if (streakData.currentStreak < 7) {
      return `${streakData.currentStreak} days strong! 🔥`;
    }

    if (streakData.currentStreak < 30) {
      return `Amazing ${streakData.currentStreak}-day streak! 🚀`;
    }

    return `Incredible ${streakData.currentStreak}-day streak! You're unstoppable! 💪`;
  }

  /**
   * Check if streak is at risk (no completion today and it's after a certain time)
   */
  static isStreakAtRisk(
    commitmentId: string, 
    records: DayRecord[], 
    riskHour: number = 18
  ): boolean {
    const now = new Date();
    const todayISO = getTodayISO();
    
    // Only consider streak at risk after the specified hour
    if (now.getHours() < riskHour) {
      return false;
    }

    const todayRecord = records.find(
      record => record.commitmentId === commitmentId && 
               record.date === todayISO &&
               record.status === 'completed'
    );

    const streakData = this.calculateStreakData(commitmentId, records);
    
    return !todayRecord && streakData.currentStreak > 0;
  }

  /**
   * Generate dates array for the commitment grid
   */
  static generateDateRange(daysBack: number = 30): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(toLocalISODate(date));
    }
    
    return dates;
  }
}