import 'dotenv/config'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import todayRouter from './routes/today.js'
import logRouter from './routes/log.js'
import parseRouter from './routes/parse.js'
import historyRouter from './routes/history.js'
import foodsRouter from './routes/foods.js'
import settingsRouter from './routes/settings.js'
import authRouter from './routes/auth.js'
import { db } from './db.js'
import { isApiKeyConfigured, PARSE_MODEL } from './llm.js'
import { accessCodeLength, hasValidSession, isAuthConfigured, requireAuth } from './auth.js'
import { renderLoginPage } from './loginPage.js'
import { rateLimit } from './rateLimit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT ?? '3001')
const IS_PROD = process.env.NODE_ENV === 'production'

// Read from package.json so /health can't drift out of sync with the release.
// Depth differs between dev (server/) and build output (dist/server/).
const VERSION: string = (() => {
  for (const rel of ['../package.json', '../../package.json']) {
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, rel), 'utf8')).version
    } catch { /* try next */ }
  }
  return 'unknown'
})()

const app = express()

app.use(compression())
app.use(express.json())

if (!IS_PROD) {
  // credentials:true so the dev client on :5173 can send the session cookie.
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
}

// ─── Auth (public: this is how you get a session) ─────────────────────────────
app.use('/api/auth', authRouter)

// ─── API routes (all gated) ───────────────────────────────────────────────────
// requireAuth fails closed — if auth config is missing, requests are refused
// rather than served, so a misconfigured deploy is locked, not wide open.
app.use('/api/today', requireAuth, todayRouter)
app.use('/api/log', requireAuth, logRouter)
// Parsing is the only route that costs money, so it carries a spend cap on top
// of auth: 30/min and 300/hour is far above real use, far below abuse.
app.use(
  '/api/parse',
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 30, message: 'Too many parse requests — slow down.' }),
  rateLimit({ windowMs: 3_600_000, max: 300, message: 'Hourly parse limit reached.' }),
  parseRouter
)
app.use('/api/history', requireAuth, historyRouter)
app.use('/api/foods', requireAuth, foodsRouter)
app.use('/api/settings', requireAuth, settingsRouter)

// Health check for Render
app.get('/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get()
    res.json({
      status: 'ok',
      db: 'connected',
      // Reports whether the key is present, never its value.
      llm_key: isApiKeyConfigured() ? 'configured' : 'missing',
      // Presence and count only — never which addresses are allowed.
      auth: isAuthConfigured() ? 'configured' : 'missing',
      code_length: accessCodeLength(),
      model: PARSE_MODEL,
      version: VERSION,
      ts: new Date().toISOString()
    })
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' })
  }
})

// ─── Static files (production) ────────────────────────────────────────────────
if (IS_PROD) {
  const staticPath = path.join(__dirname, '../../dist')

  // Gate the page itself, ahead of express.static: an unauthenticated visitor
  // receives only the sign-in page, never the app bundle or its assets.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (hasValidSession(req)) return next()
    res.status(200).type('html').send(renderLoginPage())
  })

  app.use(express.static(staticPath, { maxAge: '1d' }))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Gram Reaper v${VERSION} running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`)
  if (isAuthConfigured()) {
    console.log(`Auth: access code enabled (${accessCodeLength()} digits)`)
  } else {
    console.error(
      '\n  ⛔ AUTH IS NOT CONFIGURED — every API route will refuse requests (503).\n' +
      '     Required: APP_ACCESS_CODE\n' +
      '     Local:  add APP_ACCESS_CODE=1234 to .env\n' +
      '     Fly.io: fly secrets set APP_ACCESS_CODE=1234\n'
    )
  }
  if (isApiKeyConfigured()) {
    console.log(`OpenRouter: key configured, model ${PARSE_MODEL}`)
  } else {
    // Not fatal: quick-add cards and direct gram entry ("32g") work without it.
    console.warn(
      '\n  ⚠  OPENROUTER_API_KEY is not set — natural-language food parsing will fail.\n' +
      '     Local:  add OPENROUTER_API_KEY=sk-or-v1-... to .env\n' +
      '     Fly.io: fly secrets set OPENROUTER_API_KEY=sk-or-v1-...\n' +
      '     Key at: https://openrouter.ai/settings/keys\n'
    )
  }
})
