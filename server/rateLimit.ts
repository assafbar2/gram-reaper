import type { Request, Response, NextFunction } from 'express'

// Minimal in-memory sliding-window limiter. Single-process, single-user app, so
// there's no need for a shared store — and it must not add a dependency that
// could fail closed on the paid path.
//
// This is defence in depth behind auth: it caps how much a stolen session (or a
// runaway client retry loop) can spend on OpenRouter.
export function rateLimit(opts: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, number[]>()

  return function limiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const cutoff = now - opts.windowMs

    const recent = (hits.get(key) ?? []).filter(t => t > cutoff)

    if (recent.length >= opts.max) {
      const retryAfterMs = recent[0] + opts.windowMs - now
      res.setHeader('Retry-After', Math.max(1, Math.ceil(retryAfterMs / 1000)))
      res.status(429).json({ error: opts.message, code: 'RATE_LIMITED' })
      return
    }

    recent.push(now)
    hits.set(key, recent)

    // Opportunistic cleanup so the map can't grow without bound.
    if (hits.size > 1000) {
      for (const [k, times] of hits) {
        if (times.every(t => t <= cutoff)) hits.delete(k)
      }
    }

    next()
  }
}
