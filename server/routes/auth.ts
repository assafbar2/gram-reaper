import { Router } from 'express'
import {
  accessCodeLength,
  AuthError,
  clearSessionCookie,
  hasValidSession,
  isAuthConfigured,
  setSessionCookie,
  verifyAccessCode
} from '../auth.js'

const router = Router()

// GET /api/auth/session — am I signed in? Used by the client on boot.
// code_length lets the UI draw the right number of boxes; it isn't a secret.
router.get('/session', (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({ authenticated: false, code: 'AUTH_NOT_CONFIGURED' })
  }
  res.json({ authenticated: hasValidSession(req), code_length: accessCodeLength() })
})

// POST /api/auth/code — exchange the access code for a session cookie.
router.post('/code', (req, res) => {
  const ip = req.ip ?? 'unknown'
  try {
    verifyAccessCode(req.body?.code, ip)
    setSessionCookie(res)
    res.json({ authenticated: true })
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.retryAfterMs > 0) {
        res.setHeader('Retry-After', Math.ceil(err.retryAfterMs / 1000))
      }
      return res.status(err.status).json({ error: err.message, code: 'AUTH_REFUSED' })
    }
    console.error('POST /api/auth/code error:', err)
    res.status(500).json({ error: 'Sign-in failed', code: 'SERVER_ERROR' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ authenticated: false })
})

export default router
