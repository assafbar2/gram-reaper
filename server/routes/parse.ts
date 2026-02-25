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
  } catch (err: any) {
    console.error('POST /api/parse error:', err)
    const reason: string = (err?.message ?? '').toLowerCase()
    const isBillingError = reason.includes('credit balance') || reason.includes('billing')
    const isAuthError = !isBillingError && (reason.includes('authentication') || reason.includes('invalid x-api-key') || reason.includes('api key'))
    res.status(500).json({
      error: isBillingError
        ? 'API credits exhausted — add credits at console.anthropic.com/settings/billing'
        : isAuthError
          ? 'API key missing or invalid — check ANTHROPIC_API_KEY'
          : 'Failed to parse food',
      code: isBillingError ? 'BILLING_ERROR' : isAuthError ? 'API_KEY_ERROR' : 'SERVER_ERROR'
    })
  }
})

export default router
