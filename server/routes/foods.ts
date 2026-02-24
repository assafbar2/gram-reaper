import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

// GET /api/foods — full catalog (for client-side search)
router.get('/', (_req, res) => {
  const foods = db.prepare('SELECT * FROM foods ORDER BY name ASC').all()
  res.json({ foods })
})

// PATCH /api/foods/:id — manual correction
router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const { name, protein_g } = req.body

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(id)
  if (!food) return res.status(404).json({ error: 'Food not found', code: 'NOT_FOUND' })

  if (name !== undefined && protein_g !== undefined) {
    const updated = db.prepare(
      'UPDATE foods SET name = ?, name_normalized = ?, protein_g = ? WHERE id = ? RETURNING *'
    ).get(name, name.toLowerCase().trim().replace(/\s+/g, ' '), parseFloat(protein_g), id)
    return res.json({ food: updated })
  }
  if (name !== undefined) {
    const updated = db.prepare(
      'UPDATE foods SET name = ?, name_normalized = ? WHERE id = ? RETURNING *'
    ).get(name, name.toLowerCase().trim().replace(/\s+/g, ' '), id)
    return res.json({ food: updated })
  }
  if (protein_g !== undefined) {
    const updated = db.prepare(
      'UPDATE foods SET protein_g = ? WHERE id = ? RETURNING *'
    ).get(parseFloat(protein_g), id)
    return res.json({ food: updated })
  }
  return res.status(400).json({ error: 'Nothing to update', code: 'BAD_REQUEST' })
})

export default router
