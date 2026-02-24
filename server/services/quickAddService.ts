import { db, type QuickAddCard } from '../db.js'

export function getQuickAddCards(today: string, limit = 10): QuickAddCard[] {
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60

  // Get candidate foods with stats
  const rows = db.prepare(`
    SELECT
      f.id                                                       AS food_id,
      f.name,
      f.protein_g,
      COUNT(le.id)                                               AS total_logs,
      MAX(le.logged_at)                                          AS last_logged_at,
      AVG(
        CAST(strftime('%H', le.logged_at) AS REAL) +
        CAST(strftime('%M', le.logged_at) AS REAL) / 60.0
      )                                                          AS typical_hour,
      MAX(CASE WHEN le.logged_date = ? THEN 1 ELSE 0 END)       AS logged_today
    FROM foods f
    JOIN log_entries le ON le.food_id = f.id
    GROUP BY f.id
    HAVING COUNT(le.id) >= 1
  `).all(today) as Array<{
    food_id: number
    name: string
    protein_g: number
    total_logs: number
    last_logged_at: string
    typical_hour: number
    logged_today: number
  }>

  const scored: QuickAddCard[] = rows.map(row => {
    const score = scoreCard(row, nowHour)
    return {
      food_id: row.food_id,
      name: row.name,
      protein_g: row.protein_g,
      total_logs: row.total_logs,
      last_logged_at: row.last_logged_at,
      typical_hour: row.typical_hour,
      score,
      logged_today: row.logged_today === 1
    }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function scoreCard(
  row: { total_logs: number; last_logged_at: string; typical_hour: number; logged_today: number },
  nowHour: number
): number {
  // Frequency: log2 dampened so 100 logs isn't 100x better than 10
  const frequencyScore = Math.log2(row.total_logs + 1) * 10

  // Recency: decays over 14 days
  const daysSince = (Date.now() - new Date(row.last_logged_at).getTime()) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 30 - daysSince * 2.14)

  // Time-of-day: Gaussian peak at typical_hour
  const hourDiff = Math.abs(((nowHour - row.typical_hour + 12) % 24) - 12)
  const timeScore = 40 * Math.exp(-(hourDiff * hourDiff) / 4)

  // Slight push-back if already in today's log (still tappable for repeats)
  const alreadyLoggedPenalty = row.logged_today ? -20 : 0

  return frequencyScore + recencyScore + timeScore + alreadyLoggedPenalty
}
