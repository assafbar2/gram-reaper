import Anthropic from '@anthropic-ai/sdk'
import { db, type Food } from '../db.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a protein nutrition assistant. When given a food description, return ONLY a JSON object — no markdown, no explanation, no code fences.

The JSON must have exactly these fields:
- "name": string — clean, canonical food name (e.g. "Grilled Chicken Breast (2 pieces)", "In-N-Out Double-Double")
- "protein_g": number — grams of protein as a decimal
- "calories": number or null — estimated total calories
- "confidence": number — 0.0 to 1.0 confidence in your protein estimate
- "notes": string — one sentence explaining your estimate

Rules:
- For fast food chains (In-N-Out, McDonald's, etc.), use the restaurant's published nutrition data
- For vague quantities like "ping pong size piece", treat as approximately 30-40g of the protein food
- Always return a number for protein_g, never null or undefined
- For eggs: 1 large egg = 6g protein
- For chicken breast: ~31g protein per 100g cooked
- For Greek yogurt (full cup): ~17-20g protein`

export interface ParseResult {
  food: Food
  is_new: boolean
  confidence: number
  notes: string
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  dp[0] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function parseFood(rawInput: string): Promise<ParseResult> {
  const normalized = normalize(rawInput)

  // 1. Exact cache hit
  const exact = db.prepare('SELECT * FROM foods WHERE name_normalized = ?').get(normalized) as Food | undefined
  if (exact) {
    return { food: exact, is_new: false, confidence: 1.0, notes: 'Exact match from history.' }
  }

  // 2. Fuzzy cache: check all normalized names, find any within distance 3
  const allFoods = db.prepare('SELECT * FROM foods').all() as Food[]
  let bestMatch: Food | null = null
  let bestDist = Infinity
  for (const f of allFoods) {
    const dist = levenshtein(normalized, f.name_normalized)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = f
    }
  }
  if (bestMatch && bestDist <= 3) {
    return { food: bestMatch, is_new: false, confidence: 0.85, notes: 'Fuzzy match from history.' }
  }

  // 3. Claude Haiku
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: rawInput }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let parsed: { name: string; protein_g: number; calories: number | null; confidence: number; notes: string }

  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback if Claude returns unexpected format
    parsed = { name: rawInput, protein_g: 20, calories: null, confidence: 0.3, notes: 'Parse failed, estimated.' }
  }

  // Persist to foods table (cache for future hits)
  const food = db.prepare(`
    INSERT INTO foods (name, name_normalized, protein_g, calories, source)
    VALUES (?, ?, ?, ?, 'ai')
    ON CONFLICT (name_normalized) DO UPDATE SET
      protein_g = excluded.protein_g,
      calories  = excluded.calories
    RETURNING *
  `).get(parsed.name, normalize(parsed.name), parsed.protein_g, parsed.calories ?? null) as Food

  return { food, is_new: true, confidence: parsed.confidence, notes: parsed.notes }
}
