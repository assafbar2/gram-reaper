import { db, recomputeDailySummary, type DailySummary } from '../db.js'

export { recomputeDailySummary }
export type { DailySummary }

export const DEFAULT_TIMEZONE = 'America/Los_Angeles'

// Validates against the runtime's own tz database, so an unknown zone can never
// reach toLocaleDateString and throw a RangeError on every request.
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// The user's configured timezone. Previously getTodayDate() ignored this
// setting entirely, so days rolled over on the server's clock (UTC on Fly)
// rather than the user's.
export function getTimezone(): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as
    | { value: string }
    | undefined
  const tz = row?.value?.trim()
  if (tz && isValidTimezone(tz)) return tz
  const envTz = process.env.TZ?.trim()
  if (envTz && isValidTimezone(envTz)) return envTz
  return DEFAULT_TIMEZONE
}

export function getTodayDate(timezone?: string): string {
  const tz = timezone ?? getTimezone()
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
}

// Fractional hour (0–24) in the user's timezone. Used to rank quick-add cards
// against the hours foods were historically logged at.
export function getLocalHour(timezone?: string): number {
  const tz = timezone ?? getTimezone()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date())

  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  // en-GB renders midnight as "24" in some ICU versions; normalise to 0.
  return (hour % 24) + minute / 60
}

// Shifts a YYYY-MM-DD date string by whole days without tripping over DST —
// the date is treated as a plain calendar date, not an instant.
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
