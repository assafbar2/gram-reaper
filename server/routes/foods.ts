import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

// GET /api/foods — full catalog (for client-side search)
router.get('/', (_req, res) => {
  const foods = db.prepare('SELECT * FROM foods ORDER BY name ASC').all()
  res.json({ foods })
})

function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

// PATCH /api/foods/:id — manual correction
router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid food id', code: 'BAD_REQUEST' })
  }

  const { name, protein_g } = req.body
  if (name === undefined && protein_g === undefined) {
    return res.status(400).json({ error: 'Nothing to update', code: 'BAD_REQUEST' })
  }

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(id)
  if (!food) return res.status(404).json({ error: 'Food not found', code: 'NOT_FOUND' })

  // Validate before touching the DB so a bad value can't reach the schema.
  let nextName: string | undefined
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name must be a non-empty string', code: 'BAD_REQUEST' })
    }
    nextName = name.trim()
  }

  let nextProtein: number | undefined
  if (protein_g !== undefined) {
    const parsed = parseFloat(protein_g)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'protein_g must be a number >= 0', code: 'BAD_REQUEST' })
    }
    nextProtein = parsed
  }

  // Renaming onto an existing food violates the UNIQUE index on
  // name_normalized. Previously that surfaced as an unhandled SQLite error
  // and a bare 500; report it as the conflict it is.
  if (nextName !== undefined) {
    const clash = db.prepare(
      'SELECT id FROM foods WHERE name_normalized = ? AND id != ?'
    ).get(normalize(nextName), id) as { id: number } | undefined
    if (clash) {
      return res.status(409).json({
        error: `Another food is already named "${nextName}".`,
        code: 'NAME_CONFLICT'
      })
    }
  }

  try {
    let updated
    if (nextName !== undefined && nextProtein !== undefined) {
      updated = db.prepare(
        'UPDATE foods SET name = ?, name_normalized = ?, protein_g = ? WHERE id = ? RETURNING *'
      ).get(nextName, normalize(nextName), nextProtein, id)
    } else if (nextName !== undefined) {
      updated = db.prepare(
        'UPDATE foods SET name = ?, name_normalized = ? WHERE id = ? RETURNING *'
      ).get(nextName, normalize(nextName), id)
    } else {
      updated = db.prepare(
        'UPDATE foods SET protein_g = ? WHERE id = ? RETURNING *'
      ).get(nextProtein!, id)
    }
    return res.json({ food: updated })
  } catch (err) {
    console.error('PATCH /api/foods/:id error:', err)
    return res.status(500).json({ error: 'Failed to update food', code: 'SERVER_ERROR' })
  }
})

export default router
