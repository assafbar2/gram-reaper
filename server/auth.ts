import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

// Access-code auth for a single-user app.
//
// The code lives in APP_ACCESS_CODE, never in the repo — this repo is public, so
// a committed code would protect nothing.
//
// "Type it every time you open the app" falls out of two choices, so there is no
// expiry logic and no second secret to configure:
//   - the session token is random per process boot, so a restart or deploy
//     invalidates it;
//   - the cookie carries no expiry, so the browser drops it when it closes.
const ACCESS_CODE = process.env.APP_ACCESS_CODE?.trim() ?? ''

const SESSION_COOKIE = 'gr_session'
const SESSION_TOKEN = crypto.randomBytes(32).toString('base64url')

export function isAuthConfigured(): boolean {
  return ACCESS_CODE.length > 0
}

export function accessCodeLength(): number {
  return ACCESS_CODE.length
}

// ─── Session cookie ───────────────────────────────────────────────────────────

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

export function setSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE, SESSION_TOKEN, {
    httpOnly: true, // not readable from JS, so XSS can't exfiltrate it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // blocks cross-site CSRF for state changes
    // No maxAge on purpose: the browser drops it on close, forcing a re-entry.
    path: '/'
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function hasValidSession(req: Request): boolean {
  if (!isAuthConfigured()) return false
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return false

  // Constant-time compare so a mismatch can't be probed byte-by-byte.
  const a = Buffer.from(token)
  const b = Buffer.from(SESSION_TOKEN)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ─── Code verification ────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// Throws AuthError on refusal; returns normally on success.
export function verifyAccessCode(code: unknown): void {
  if (!isAuthConfigured()) {
    throw new AuthError(503, 'Access code is not configured on the server.')
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new AuthError(400, 'Code is required.')
  }

  // Length is not secret (the client knows how many boxes to draw), so an
  // early length check leaks nothing while keeping the compare constant-time.
  const provided = Buffer.from(code.trim())
  const expected = Buffer.from(ACCESS_CODE)
  const ok = provided.length === expected.length && crypto.timingSafeEqual(provided, expected)

  if (!ok) {
    // Never log the submitted value.
    throw new AuthError(401, 'Incorrect code.')
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Guards everything except the sign-in routes and /health. Fails closed: if the
// server is missing its auth config, requests are refused rather than allowed.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthConfigured()) {
    res.status(503).json({
      error: 'Server auth is not configured (APP_ACCESS_CODE).',
      code: 'AUTH_NOT_CONFIGURED'
    })
    return
  }
  if (hasValidSession(req)) {
    next()
    return
  }
  res.status(401).json({ error: 'Access code required.', code: 'UNAUTHENTICATED' })
}
