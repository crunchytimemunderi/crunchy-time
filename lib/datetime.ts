/**
 * UTC date/time utilities for consistent timezone handling
 * All dates are stored in UTC in the database
 */

/**
 * Convert a local Date object to UTC ISO string for database storage
 */
export function toUTC(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a UTC date string from database to local Date object
 */
export function fromUTC(utcString: string): Date {
  return new Date(utcString);
}

/**
 * Get current UTC timestamp as ISO string
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Format UTC date to local readable format
 */
export function formatLocal(
  utcString: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = fromUTC(utcString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };
  return date.toLocaleString("en-IN", defaultOptions);
}

/**
 * Get start of day in UTC for a given local date
 */
export function startOfDayUTC(localDate: Date): string {
  const startOfDay = new Date(localDate);
  startOfDay.setHours(0, 0, 0, 0);
  return toUTC(startOfDay);
}

/**
 * Get end of day in UTC for a given local date
 */
export function endOfDayUTC(localDate: Date): string {
  const endOfDay = new Date(localDate);
  endOfDay.setHours(23, 59, 59, 999);
  return toUTC(endOfDay);
}

/**
 * Convert YYYY-MM-DD string to UTC start of day
 */
export function dateStringToUTC(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return toUTC(date);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Check if two UTC timestamps are on the same day (local time)
 */
export function isSameDay(utc1: string, utc2: string): boolean {
  const date1 = fromUTC(utc1);
  const date2 = fromUTC(utc2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
