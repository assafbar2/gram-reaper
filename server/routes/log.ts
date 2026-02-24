import { Router } from 'express'
import { db } from '../db.js'
import { getTodayDate, recomputeDailySummary } from '../services/summaryService.js'
import { parseFood } from '../services/parseService.js'

const router = Router()

// POST /api/log
// Body: { food_id?: number, raw_input?: string, quantity?: number, date?: string }
router.post('/', async (req, res) => {
  try {
    const { food_id, raw_input, quantity = 1.0, date } = req.body
    const logDate = date || getTodayDate()

    let foodId: number
    let proteinG: number

    if (food_id) {
      // Quick-add path: food already known
      const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(food_id) as { protein_g: number } | undefined
      if (!food) {
        return res.status(404).json({ error: 'Food not found', code: 'NOT_FOUND' })
      }
      foodId = food_id
      proteinG = food.protein_g * quantity
    } else if (raw_input) {
      // Natural language path: parse first
      const result = await parseFood(raw_input)
      foodId = result.food.id
      proteinG = result.food.protein_g * quantity
    } else {
      return res.status(400).json({ error: 'Provide food_id or raw_input', code: 'BAD_REQUEST' })
    }

    const entry = db.prepare(`
      INSERT INTO log_entries (food_id, logged_date, quantity, protein_g, raw_input)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).get(foodId, logDate, quantity, proteinG, raw_input ?? null) as any

    // Join food name for the response
    const food = db.prepare('SELECT name FROM foods WHERE id = ?').get(foodId) as { name: string }
    const enrichedEntry = { ...entry, food_name: food.name }

    const summary = recomputeDailySummary(logDate)

    res.json({ entry: enrichedEntry, summary })
  } catch (err) {
    console.error('POST /api/log error:', err)
    res.status(500).json({ error: 'Failed to log food', code: 'SERVER_ERROR' })
  }
})

// DELETE /api/log/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id)

  const entry = db.prepare('SELECT logged_date FROM log_entries WHERE id = ?').get(id) as { logged_date: string } | undefined
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found', code: 'NOT_FOUND' })
  }

  db.prepare('DELETE FROM log_entries WHERE id = ?').run(id)
  const summary = recomputeDailySummary(entry.logged_date)

  res.json({ summary })
})

export default router
