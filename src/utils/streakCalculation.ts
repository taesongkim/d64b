import { DayRecord } from '@/store/slices/recordsSlice';

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
      .filter(record => record.commitmentId === commitmentId && record.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (commitmentRecords.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        totalCompletions: 0,
        completionRate: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate current streak
    let currentStreak = 0;
    let currentDate = new Date(today);

    // Check if today is completed
    const todayRecord = commitmentRecords.find(
      record => new Date(record.date).getTime() === today.getTime()
    );

    // Start checking from today if completed, otherwise yesterday
    if (!todayRecord) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    while (currentDate.getTime() >= new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000))) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const record = commitmentRecords.find(r => r.date === dateStr);
      
      if (record && record.completed) {
        currentStreak++;
      } else {
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
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Only consider streak at risk after the specified hour
    if (now.getHours() < riskHour) {
      return false;
    }

    const todayRecord = records.find(
      record => record.commitmentId === commitmentId && 
               record.date === today.toISOString().split('T')[0] &&
               record.completed
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
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }
}