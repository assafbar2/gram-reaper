import { Router } from 'express'
import { db } from '../db.js'
import { getTodayDate, recomputeDailySummary } from '../services/summaryService.js'
import { getQuickAddCards } from '../services/quickAddService.js'

const router = Router()

// GET /api/today — batched response: entries + summary + quick-add cards
router.get('/', (req, res) => {
  const today = getTodayDate()

  const entries = db.prepare(`
    SELECT
      le.id,
      le.food_id,
      f.name  AS food_name,
      le.logged_date,
      le.logged_at,
      le.quantity,
      le.protein_g,
      le.raw_input
    FROM log_entries le
    JOIN foods f ON f.id = le.food_id
    WHERE le.logged_date = ?
    ORDER BY le.logged_at DESC
  `).all(today)

  const summary = db.prepare(
    'SELECT * FROM daily_summaries WHERE date = ?'
  ).get(today) ?? recomputeDailySummary(today)

  const quickadd = getQuickAddCards(today)

  res.json({ today, entries, summary, quickadd })
})

export default router
