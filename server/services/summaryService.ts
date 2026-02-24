import { recomputeDailySummary, type DailySummary } from '../db.js'

export { recomputeDailySummary }

export function getTodayDate(timezone?: string): string {
  const tz = timezone || process.env.TZ || 'America/Los_Angeles'
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
}
