import { Router } from 'express'
import { parseFood } from '../services/parseService.js'
import { describeLlmError } from '../llm.js'

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
    const { status, body } = describeLlmError(err, 'Failed to parse food')
    res.status(status).json(body)
  }
})

export default router
