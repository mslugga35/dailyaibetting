/**
 * Date Utilities
 * Centralized date handling for Eastern timezone operations
 * @module lib/utils/date
 */

/**
 * Get today's date in Eastern timezone (YYYY-MM-DD format)
 * Uses Intl.DateTimeFormat for reliable timezone conversion
 * @returns {string} Today's date in YYYY-MM-DD format
 * @example
 * const today = getTodayET(); // "2026-02-04"
 */
export function getTodayET(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
}

/**
 * Get yesterday's date in Eastern timezone (YYYY-MM-DD format)
 * @returns {string} Yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayET(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(yesterday);
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
}

/**
 * Convert UTC date string to Eastern timezone date (YYYY-MM-DD)
 * @param {string} utcDateStr - UTC date string (ISO format)
 * @returns {string} Date in YYYY-MM-DD format (Eastern timezone)
 */
export function toEasternDate(utcDateStr: string): string {
  try {
    const date = new Date(utcDateStr);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return utcDateStr.split('T')[0];
  }
}

/**
 * Get current year from Eastern timezone
 * @returns {string} Current year (e.g., "2026")
 */
export function getCurrentYearET(): string {
  return getTodayET().split('-')[0];
}
