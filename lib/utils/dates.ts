import { format, getMonth, getYear, endOfMonth, differenceInDays } from 'date-fns'

/**
 * Returns the current month key e.g. "2024-05"
 */
export function getCurrentMonthKey(): string {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Format a month key to a readable string e.g. "2024-05" → "May 2024"
 */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return format(date, 'MMMM yyyy')
}

/**
 * Returns number of days remaining in the current month
 */
export function daysRemainingInMonth(): number {
  const now = new Date()
  const end = endOfMonth(now)
  return differenceInDays(end, now)
}

/**
 * Returns all month keys for a season
 * e.g. year=2024, startMonth=4, endMonth=11 → ["2024-04", ..., "2024-11"]
 */
export function getSeasonMonths(
  year: number,
  startMonth: number,
  endMonth: number
): string[] {
  const months: string[] = []
  for (let m = startMonth; m <= endMonth; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`)
  }
  return months
}

/**
 * Check if a month key is within the current scoring window
 */
export function isCurrentMonth(monthKey: string): boolean {
  return monthKey === getCurrentMonthKey()
}

/**
 * Check if a month key is in the past
 */
export function isPastMonth(monthKey: string): boolean {
  return monthKey < getCurrentMonthKey()
}

/**
 * Sort month keys ascending
 */
export function sortMonthKeys(months: string[]): string[] {
  return [...months].sort()
}

/**
 * Returns the short month name e.g. "2024-05" → "May"
 */
export function getShortMonthName(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return format(new Date(year, month - 1, 1), 'MMM')
}

/**
 * Format a Firebase Timestamp to a readable date string
 */
export function formatTimestamp(
  ts: { seconds: number; nanoseconds: number } | undefined
): string {
  if (!ts) return '—'
  return format(new Date(ts.seconds * 1000), 'MMM d, yyyy')
}

/**
 * Format a Firebase Timestamp to date + time
 */
export function formatTimestampFull(
  ts: { seconds: number; nanoseconds: number } | undefined
): string {
  if (!ts) return '—'
  return format(new Date(ts.seconds * 1000), 'MMM d, yyyy h:mm a')
}
