import { Router } from 'express'
import {
  AuthError,
  clearSessionCookie,
  getSessionEmail,
  GOOGLE_CLIENT_ID,
  isAuthConfigured,
  setSessionCookie,
  verifyGoogleIdToken
} from '../auth.js'

const router = Router()

// GET /api/auth/session — who am I? Used by the client on boot.
// Also returns the Google client ID so the SPA doesn't need it baked in at
// build time (it is public by design, and Fly secrets are runtime-only).
router.get('/session', (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({ authenticated: false, code: 'AUTH_NOT_CONFIGURED' })
  }
  const email = getSessionEmail(req)
  res.json({ authenticated: email !== null, email, google_client_id: GOOGLE_CLIENT_ID })
})

// POST /api/auth/google — exchange a Google ID token for a session cookie.
router.post('/google', async (req, res) => {
  const { credential } = req.body ?? {}
  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'credential is required', code: 'BAD_REQUEST' })
  }

  try {
    const email = await verifyGoogleIdToken(credential)
    setSessionCookie(res, email)
    res.json({ authenticated: true, email })
  } catch (err) {
    if (err instanceof AuthError) {
      // Logged without the token itself, which is a bearer credential.
      console.warn(`Sign-in refused (${err.status}): ${err.message}`)
      return res.status(err.status).json({ error: err.message, code: 'AUTH_REFUSED' })
    }
    console.error('POST /api/auth/google error:', err)
    res.status(500).json({ error: 'Sign-in failed', code: 'SERVER_ERROR' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ authenticated: false })
})

export default router
