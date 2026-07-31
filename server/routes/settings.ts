import { Router } from 'express'
import { db } from '../db.js'
import { isValidTimezone } from '../services/summaryService.js'

const router = Router()

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
  res.json({ settings })
})

router.patch('/', (req, res) => {
  try {
    const { daily_goal_g, timezone } = req.body

    if (daily_goal_g !== undefined) {
      const g = parseFloat(daily_goal_g)
      if (isNaN(g) || g <= 0) return res.status(400).json({ error: 'Invalid goal', code: 'BAD_REQUEST' })
      db.prepare("INSERT INTO settings (key, value) VALUES ('daily_goal_g', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(String(g))
    }

    if (timezone !== undefined) {
      // Validated because getTodayDate/getLocalHour now depend on it — an
      // unknown zone would otherwise throw a RangeError on every request.
      if (typeof timezone !== 'string' || !isValidTimezone(timezone)) {
        return res.status(400).json({
          error: `Unknown timezone "${timezone}" — use an IANA name like "America/Los_Angeles".`,
          code: 'BAD_REQUEST'
        })
      }
      db.prepare("INSERT INTO settings (key, value) VALUES ('timezone', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(timezone.trim())
    }

    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    res.json({ settings: Object.fromEntries(rows.map(r => [r.key, r.value])) })
  } catch (err: any) {
    console.error('PATCH /api/settings error:', err)
    res.status(500).json({ error: err?.message ?? 'Failed to save settings', code: 'SERVER_ERROR' })
  }
})

// DELETE /api/settings/reset — wipe all logs, history, and food cache.
// Requires an explicit confirmation phrase in the body: this is irreversible,
// and a bare DELETE to a guessed path shouldn't be able to destroy everything.
router.delete('/reset', (req, res) => {
  if (req.body?.confirm !== 'DELETE EVERYTHING') {
    return res.status(400).json({
      error: 'Reset requires {"confirm":"DELETE EVERYTHING"} in the request body.',
      code: 'CONFIRMATION_REQUIRED'
    })
  }

  const counts = {
    entries: (db.prepare('SELECT COUNT(*) AS n FROM log_entries').get() as { n: number }).n,
    days: (db.prepare('SELECT COUNT(*) AS n FROM daily_summaries').get() as { n: number }).n,
    foods: (db.prepare('SELECT COUNT(*) AS n FROM foods').get() as { n: number }).n
  }

  db.exec('DELETE FROM log_entries')
  db.exec('DELETE FROM daily_summaries')
  db.exec('DELETE FROM foods')

  console.warn(`Data reset performed — removed ${JSON.stringify(counts)}`)
  res.json({ ok: true, deleted: counts })
})

export default router
