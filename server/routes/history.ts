import { Router } from 'express'
import { db } from '../db.js'
import { getTodayDate } from '../services/summaryService.js'

const router = Router()

// GET /api/history?limit=30&offset=0
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 30
  const offset = parseInt(req.query.offset as string) || 0

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
  const summaries = db.prepare(`
    SELECT date, goal_met FROM daily_summaries
    WHERE entry_count > 0
    ORDER BY date DESC
  `).all() as Array<{ date: string; goal_met: number }>

  const today = getTodayDate()
  let streak = 0
  let expected = today

  for (const row of summaries) {
    if (row.date !== expected) break
    if (!row.goal_met) break
    streak++
    // Subtract one day
    const d = new Date(expected + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    expected = d.toISOString().slice(0, 10)
  }

  return streak
}

export default router
