import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

// Access-code auth. A short code is only viable if guessing is expensive, so the
// throttling below is load-bearing, not decoration: a 4-digit code is 10,000
// combinations and would fall in seconds against an unthrottled endpoint.
//
// The code itself is never in the repo — it comes from the environment.
// (Google sign-in with an email allowlist is a stronger option and is preserved
// in git history at commit 0fa5d9d if you want to switch back.)
const ACCESS_CODE = process.env.APP_ACCESS_CODE?.trim() ?? ''

const SESSION_SECRET = process.env.SESSION_SECRET?.trim() ?? ''
const SESSION_COOKIE = 'gr_session'
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

// Per-IP: a handful of tries, then a lockout that grows with each failure.
const IP_MAX_ATTEMPTS = 5
const IP_BASE_LOCKOUT_MS = 60_000 // doubles per subsequent failure, capped below
const IP_MAX_LOCKOUT_MS = 60 * 60_000
// Global: bounds total guesses even if an attacker rotates IPs. 30/hour against
// 10,000 combinations puts an exhaustive search at roughly two weeks.
const GLOBAL_MAX_FAILURES_PER_HOUR = 30

export function isAuthConfigured(): boolean {
  return ACCESS_CODE.length > 0 && SESSION_SECRET.length > 0
}

export function accessCodeLength(): number {
  return ACCESS_CODE.length
}

// ─── Brute-force throttling ───────────────────────────────────────────────────

interface IpState {
  failures: number
  lockedUntil: number
}
const ipState = new Map<string, IpState>()
let globalFailures: number[] = []

function lockoutFor(failures: number): number {
  const over = Math.max(0, failures - IP_MAX_ATTEMPTS)
  return Math.min(IP_BASE_LOCKOUT_MS * 2 ** over, IP_MAX_LOCKOUT_MS)
}

// Returns remaining lockout in ms, or 0 if the caller may attempt a code.
export function throttleStatus(ip: string): number {
  const now = Date.now()
  globalFailures = globalFailures.filter(t => t > now - 3_600_000)

  if (globalFailures.length >= GLOBAL_MAX_FAILURES_PER_HOUR) {
    return globalFailures[0] + 3_600_000 - now
  }
  const state = ipState.get(ip)
  if (state && state.lockedUntil > now) return state.lockedUntil - now
  return 0
}

function recordFailure(ip: string): void {
  const now = Date.now()
  globalFailures.push(now)

  const state = ipState.get(ip) ?? { failures: 0, lockedUntil: 0 }
  state.failures += 1
  if (state.failures >= IP_MAX_ATTEMPTS) {
    state.lockedUntil = now + lockoutFor(state.failures)
  }
  ipState.set(ip, state)

  if (ipState.size > 1000) {
    for (const [k, v] of ipState) {
      if (v.lockedUntil < now - IP_MAX_LOCKOUT_MS) ipState.delete(k)
    }
  }
}

function clearFailures(ip: string): void {
  ipState.delete(ip)
}

// ─── Session cookie: "<base64url payload>.<hmac>" ─────────────────────────────

interface SessionPayload {
  exp: number
}

function sign(value: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url')
}

function createSessionToken(): string {
  const payload: SessionPayload = { exp: Date.now() + SESSION_TTL_MS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function verifySessionToken(token: string): boolean {
  const dot = token.lastIndexOf('.')
  if (dot < 1) return false
  const encoded = token.slice(0, dot)

  // Constant-time compare so a mismatch can't be probed byte-by-byte.
  const a = Buffer.from(token.slice(dot + 1))
  const b = Buffer.from(sign(encoded))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload
    return typeof payload.exp === 'number' && payload.exp >= Date.now()
  } catch {
    return false
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

export function setSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true, // not readable from JS, so XSS can't exfiltrate it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // blocks cross-site CSRF for state changes
    maxAge: SESSION_TTL_MS,
    path: '/'
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function hasValidSession(req: Request): boolean {
  if (!isAuthConfigured()) return false
  const token = readCookie(req, SESSION_COOKIE)
  return token ? verifySessionToken(token) : false
}

// ─── Code verification ────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfterMs = 0) {
    super(message)
    this.name = 'AuthError'
  }
}

// Throws AuthError on refusal; returns normally on success.
export function verifyAccessCode(code: unknown, ip: string): void {
  if (!isAuthConfigured()) {
    throw new AuthError(503, 'Access code is not configured on the server.')
  }
  if (typeof code !== 'string' || code.length === 0) {
    throw new AuthError(400, 'Code is required.')
  }

  const waitMs = throttleStatus(ip)
  if (waitMs > 0) {
    throw new AuthError(
      429,
      `Too many incorrect attempts. Try again in ${Math.ceil(waitMs / 1000)}s.`,
      waitMs
    )
  }

  // Length is not secret (the client knows how many boxes to draw), so an
  // early length check leaks nothing while keeping the compare constant-time.
  const provided = Buffer.from(code.trim())
  const expected = Buffer.from(ACCESS_CODE)
  const ok = provided.length === expected.length && crypto.timingSafeEqual(provided, expected)

  if (!ok) {
    recordFailure(ip)
    // Never log the submitted value.
    console.warn(`Failed access-code attempt from ${ip}`)
    throw new AuthError(401, 'Incorrect code.')
  }

  clearFailures(ip)
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Guards everything except the sign-in routes and /health. Fails closed: if the
// server is missing its auth config, requests are refused rather than allowed.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthConfigured()) {
    res.status(503).json({
      error: 'Server auth is not configured (APP_ACCESS_CODE, SESSION_SECRET).',
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
