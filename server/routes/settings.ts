import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({ settings })
})

router.patch('/', (req, res) => {
  const { daily_goal_g, timezone } = req.body

  if (daily_goal_g !== undefined) {
    const g = parseFloat(daily_goal_g)
    if (isNaN(g) || g <= 0) return res.status(400).json({ error: 'Invalid goal', code: 'BAD_REQUEST' })
    db.prepare("INSERT INTO settings (key, value) VALUES ('daily_goal_g', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(String(g))
  }

  if (timezone !== undefined) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('timezone', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(timezone)
  }

  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  res.json({ settings: Object.fromEntries(rows.map(r => [r.key, r.value])) })
})

export default router
