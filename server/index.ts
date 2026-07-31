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
import { db } from './db.js'
import { isApiKeyConfigured, PARSE_MODEL } from './llm.js'

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
  app.use(cors({ origin: 'http://localhost:5173' }))
}

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/today', todayRouter)
app.use('/api/log', logRouter)
app.use('/api/parse', parseRouter)
app.use('/api/history', historyRouter)
app.use('/api/foods', foodsRouter)
app.use('/api/settings', settingsRouter)

// Health check for Render
app.get('/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get()
    res.json({
      status: 'ok',
      db: 'connected',
      // Reports whether the key is present, never its value.
      llm_key: isApiKeyConfigured() ? 'configured' : 'missing',
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
  app.use(express.static(staticPath, { maxAge: '1d' }))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Gram Reaper v${VERSION} running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`)
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
