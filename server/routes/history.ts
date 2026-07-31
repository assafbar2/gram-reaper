import { Router } from 'express'
import { db } from '../db.js'
import { getTodayDate, shiftDate } from '../services/summaryService.js'

const router = Router()

// GET /api/history?limit=30&offset=0
router.get('/', (req, res) => {
  // Clamped: a negative LIMIT means "unbounded" in SQLite, and a negative
  // OFFSET is a syntax-level surprise rather than an error.
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 30, 1), 365)
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

  const days = db.prepare(`
    SELECT * FROM daily_summaries
    ORDER BY date DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset)

  const streak = computeStreak()
  const bestDay = db.prepare('SELECT MAX(total_g) as best FROM daily_summaries').get() as { best: number | null }
  const goalDays = db.prepare('SELECT COUNT(*) as count FROM daily_summaries WHERE goal_met = 1').get() as { count: number }
  const totalDays = db.prepare('SELECT COUNT(*) as count FROM daily_summaries WHERE entry_count > 0').get() as { count: number }

  res.json({
    days,
    streak,
    best_day_g: bestDay.best ?? 0,
    goal_days: goalDays.count,
    total_logged_days: totalDays.count
  })
})

// GET /api/history/:date
router.get('/:date', (req, res) => {
  const { date } = req.params

  const entries = db.prepare(`
    SELECT
      le.id,
      le.food_id,
      f.name AS food_name,
      le.logged_date,
      le.logged_at,
      le.quantity,
      le.protein_g,
      le.raw_input
    FROM log_entries le
    JOIN foods f ON f.id = le.food_id
    WHERE le.logged_date = ?
    ORDER BY le.logged_at ASC
  `).all(date)

  const summary = db.prepare('SELECT * FROM daily_summaries WHERE date = ?').get(date) ?? null

  res.json({ date, entries, summary })
})

function computeStreak(): number {
  const rows = db.prepare(`
    SELECT date, goal_met FROM daily_summaries
    WHERE entry_count > 0
    ORDER BY date DESC
  `).all() as Array<{ date: string; goal_met: number }>

  const metByDate = new Map(rows.map(r => [r.date, r.goal_met === 1]))
  const today = getTodayDate()

  // Today is still in progress: if the goal isn't met yet, start counting from
  // yesterday instead of returning 0. Previously the streak read as 0 every
  // morning until the day's first entry crossed the goal.
  let cursor = metByDate.get(today) ? today : shiftDate(today, -1)

  let streak = 0
  while (metByDate.get(cursor)) {
    streak++
    cursor = shiftDate(cursor, -1)
  }

  return streak
}

export default router
