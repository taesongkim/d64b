/**
 * Centralized time utilities for consistent local timezone handling
 * All functions use the user's local timezone to ensure consistency
 */

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 */
export function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a date string in YYYY-MM-DD format from a Date object using local timezone
 */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object in local timezone
 * Avoids timezone issues by parsing components directly
 */
export function parseLocalISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Check if a date string represents today in local timezone
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayISO();
}

/**
 * Get today's date formatted for display in the dashboard header
 */
export function getTodayDisplayDate(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Format a date string for display in various contexts
 */
export function formatDateForDisplay(dateString: string, format: 'day' | 'short' | 'full' = 'day'): string {
  const date = parseLocalISODate(dateString);
  
  switch (format) {
    case 'day':
      return date.getDate().toString();
    case 'short':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'full':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    default:
      return date.getDate().toString();
  }
}

/**
 * Generate a date range array going back N days from today
 */
export function generateDateRange(daysBack: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(toLocalISODate(date));
  }
  
  return dates;
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(dateString: string): boolean {
  const date = parseLocalISODate(dateString);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Get the current time for timestamps (still uses ISO string for consistency with backend)
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format date range label for CommitmentGrid header
 */
export function formatDateRangeLabel(startISO: string, endISO: string): string {
  const start = parseLocalISODate(startISO);
  const end = parseLocalISODate(endISO);
  
  // Same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${end.getFullYear()}`;
  }
  
  // Different months, same year
  if (start.getFullYear() === end.getFullYear()) {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonth}-${endMonth} ${end.getFullYear()}`;
  }
  
  // Different years
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return `${startMonth} ${start.getFullYear()}-${endMonth} ${end.getFullYear()}`;
}
