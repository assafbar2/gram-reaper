import { Router } from 'express'
import { parseFood } from '../services/parseService.js'

const router = Router()

// POST /api/parse
// Body: { input: string }
router.post('/', async (req, res) => {
  const { input } = req.body
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ error: 'input is required', code: 'BAD_REQUEST' })
  }

  try {
    const result = await parseFood(input.trim())
    res.json(result)
  } catch (err) {
    console.error('POST /api/parse error:', err)
    res.status(500).json({ error: 'Failed to parse food', code: 'SERVER_ERROR' })
  }
})

export default router
