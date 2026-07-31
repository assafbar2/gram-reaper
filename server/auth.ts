import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { OAuth2Client } from 'google-auth-library'

// Google Identity Services ID-token flow: the browser hands us a signed JWT and
// we verify it server-side. Only the client ID is needed (it is public) — there
// is no client secret to store or rotate.
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() ?? ''

// Comma-separated allowlist, e.g. "you@gmail.com". Compared lowercase.
const ALLOWED_EMAILS = new Set(
  (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
)

const SESSION_SECRET = process.env.SESSION_SECRET?.trim() ?? ''
const SESSION_COOKIE = 'gr_session'
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export function isAuthConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0 && SESSION_SECRET.length > 0 && ALLOWED_EMAILS.size > 0
}

export function allowedEmailCount(): number {
  return ALLOWED_EMAILS.size
}

// ─── Session cookie: "<base64url payload>.<hmac>" ─────────────────────────────

interface SessionPayload {
  email: string
  exp: number
}

function sign(value: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url')
}

function createSessionToken(email: string): string {
  const payload: SessionPayload = { email, exp: Date.now() + SESSION_TTL_MS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const encoded = token.slice(0, dot)
  const provided = token.slice(dot + 1)
  const expected = sign(encoded)

  // Constant-time compare so a mismatch can't be probed byte-by-byte.
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    // Re-check the allowlist on every request: revoking access by removing an
    // address takes effect immediately, without waiting for cookies to expire.
    if (!ALLOWED_EMAILS.has(payload.email.toLowerCase())) return null
    return payload
  } catch {
    return null
  }
}

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

export function setSessionCookie(res: Response, email: string): void {
  res.cookie(SESSION_COOKIE, createSessionToken(email), {
    httpOnly: true, // not readable from JS, so XSS can't exfiltrate it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // blocks cross-site form/fetch CSRF for state changes
    maxAge: SESSION_TTL_MS,
    path: '/'
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function getSessionEmail(req: Request): string | null {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  return verifySessionToken(token)?.email ?? null
}

// ─── Google ID token verification ─────────────────────────────────────────────

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

export class AuthError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// Verifies the ID token and enforces the allowlist. Returns the email on
// success; throws AuthError otherwise.
export async function verifyGoogleIdToken(idToken: string): Promise<string> {
  if (!isAuthConfigured()) {
    throw new AuthError(503, 'Sign-in is not configured on the server.')
  }

  let payload
  try {
    // Checks signature, issuer, expiry, and that `aud` matches our client ID.
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    payload = ticket.getPayload()
  } catch {
    throw new AuthError(401, 'Google sign-in could not be verified.')
  }

  if (!payload?.email) throw new AuthError(401, 'Google account has no email address.')
  // An unverified address could be attacker-controlled, so treat it as invalid
  // even if the string happens to match the allowlist.
  if (!payload.email_verified) throw new AuthError(403, 'This Google email is not verified.')

  const email = payload.email.toLowerCase()
  if (!ALLOWED_EMAILS.has(email)) {
    // Deliberately does not reveal who *is* allowed.
    throw new AuthError(403, 'This Google account is not authorised for this app.')
  }
  return email
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Guards everything except the sign-in route and /health. Fails closed: if the
// server is missing its auth config, requests are refused rather than allowed.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthConfigured()) {
    res.status(503).json({
      error: 'Server auth is not configured (GOOGLE_CLIENT_ID, ALLOWED_EMAILS, SESSION_SECRET).',
      code: 'AUTH_NOT_CONFIGURED'
    })
    return
  }
  if (getSessionEmail(req)) {
    next()
    return
  }
  res.status(401).json({ error: 'Sign-in required.', code: 'UNAUTHENTICATED' })
}
