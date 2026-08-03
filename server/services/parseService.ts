import { db, type Food } from '../db.js'
import { getLlmClient, PARSE_MODEL } from '../llm.js'

const SYSTEM_PROMPT = `You are a protein nutrition assistant. Given a food description, estimate its protein content.

Field guidance:
- "name": clean, canonical food name (e.g. "Grilled Chicken Breast (2 pieces)", "In-N-Out Double-Double")
- "protein_g": grams of protein as a decimal
- "calories": estimated total calories, or null if you cannot estimate
- "confidence": 0.0 to 1.0 confidence in your protein estimate
- "notes": one sentence explaining your estimate

Rules:
- For fast food chains (In-N-Out, McDonald's, etc.), use the restaurant's published nutrition data
- For vague quantities like "ping pong size piece", treat as approximately 30-40g of the protein food
- Always return a number for protein_g, never null
- Respect the quantity in the input: "3 eggs" is three times "1 egg"
- For eggs: 1 large egg = 6g protein
- For chicken breast: ~31g protein per 100g cooked
- For Greek yogurt (full cup): ~17-20g protein`

// Structured-output contract. Grok 4.5 supports strict JSON schema enforcement
// on OpenRouter, so the model cannot return prose or fenced markdown — which
// removes the whole class of "unparseable response" failures.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    protein_g: { type: 'number' },
    calories: { type: ['number', 'null'] },
    confidence: { type: 'number' },
    notes: { type: 'string' }
  },
  // strict mode requires every property listed in `required`
  required: ['name', 'protein_g', 'calories', 'confidence', 'notes'],
  additionalProperties: false
} as const

interface ProteinEstimate {
  name: string
  protein_g: number
  calories: number | null
  confidence: number
  notes: string
}

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

// All digit runs in order, e.g. "2 eggs and 4 oz beef" -> "2,4".
// Two descriptions with different quantities are different foods, never typos.
function quantitySignature(input: string): string {
  return (input.match(/\d+(?:\.\d+)?/g) ?? []).join(',')
}

// A fuzzy match is only safe when the edit distance is small *relative to the
// length of what was typed*. A fixed threshold of 3 let "10 eggs" match
// "2 eggs" (distance 2) and silently log a fifth of the protein.
function isFuzzyMatch(input: string, candidate: string, distance: number): boolean {
  if (quantitySignature(input) !== quantitySignature(candidate)) return false
  const shorter = Math.min(input.length, candidate.length)
  const allowed = Math.max(1, Math.floor(shorter * 0.15))
  return distance <= allowed
}

export async function parseFood(rawInput: string): Promise<ParseResult> {
  const normalized = normalize(rawInput)

  // 0. Direct gram entry: a number and a gram unit and nothing else, e.g.
  // "10g", "12G", "14 g", "10gr", "10 gr", "25gram", "30 grams". Those are
  // grams of protein, logged as-is with no AI call.
  //
  // The trailing $ is what separates this from a food description: "10 grams of
  // chicken" has more after the unit, so it falls through to the LLM to work out
  // the protein. Keep the anchor.
  const directMatch = rawInput.trim().match(/^(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)$/i)
  if (directMatch) {
    const proteinG = parseFloat(directMatch[1])
    const name = `${proteinG}g`
    const food = db.prepare(`
      INSERT INTO foods (name, name_normalized, protein_g, calories, source)
      VALUES (?, ?, ?, NULL, 'direct')
      ON CONFLICT (name_normalized) DO UPDATE SET protein_g = excluded.protein_g
      RETURNING *
    `).get(name, name, proteinG) as unknown as Food
    return { food, is_new: false, confidence: 1.0, notes: 'Direct gram entry.' }
  }

  // 1. Exact cache hit
  const exact = db.prepare('SELECT * FROM foods WHERE name_normalized = ?').get(normalized) as unknown as Food | undefined
  if (exact) {
    return { food: exact, is_new: false, confidence: 1.0, notes: 'Exact match from history.' }
  }

  // 2. Fuzzy cache: nearest name, accepted only if it clears isFuzzyMatch.
  // Direct gram entries are excluded — "32g" is not a typo of anything.
  const allFoods = db.prepare("SELECT * FROM foods WHERE source != 'direct'").all() as unknown as Food[]
  let bestMatch: Food | null = null
  let bestDist = Infinity
  for (const f of allFoods) {
    const dist = levenshtein(normalized, f.name_normalized)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = f
    }
  }
  if (bestMatch && isFuzzyMatch(normalized, bestMatch.name_normalized, bestDist)) {
    return { food: bestMatch, is_new: false, confidence: 0.85, notes: 'Fuzzy match from history.' }
  }

  // 3. Grok via OpenRouter — throws MissingApiKeyError if the key isn't configured
  const completion = await getLlmClient().chat.completions.create({
    model: PARSE_MODEL,
    max_tokens: 1200, // headroom: reasoning tokens count toward this on Grok
    reasoning_effort: 'low', // simple extraction; keeps latency and cost down
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: rawInput }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'protein_estimate',
        strict: true,
        schema: RESPONSE_SCHEMA as unknown as Record<string, unknown>
      }
    },
    // OpenRouter extension (not in the OpenAI type surface): only route to
    // providers that honour the parameters above. Without it OpenRouter may
    // fall back to a provider that ignores response_format and returns prose.
    ...({ provider: { require_parameters: true } } as object)
  })

  const choice = completion.choices[0]
  if (choice?.finish_reason === 'length') {
    throw new Error('Model response was truncated before it produced a complete estimate.')
  }
  if (choice?.message.refusal) {
    throw new Error(`Model declined to estimate this input: ${choice.message.refusal}`)
  }

  const text = choice?.message.content?.trim()
  if (!text) {
    throw new Error('Model returned an empty response.')
  }

  let parsed: ProteinEstimate
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Model returned unparseable JSON: ${text.slice(0, 120)}`)
  }

  // Schema enforcement guarantees the shape, not the semantics — a negative or
  // non-finite protein value would corrupt every downstream total.
  if (!Number.isFinite(parsed.protein_g) || parsed.protein_g < 0) {
    throw new Error(`Model returned an invalid protein value: ${parsed.protein_g}`)
  }
  const name = parsed.name?.trim()
  if (!name) {
    throw new Error('Model returned an empty food name.')
  }

  // Persist to foods table (cache for future hits)
  const food = db.prepare(`
    INSERT INTO foods (name, name_normalized, protein_g, calories, source)
    VALUES (?, ?, ?, ?, 'ai')
    ON CONFLICT (name_normalized) DO UPDATE SET
      protein_g = excluded.protein_g,
      calories  = excluded.calories
    RETURNING *
  `).get(name, normalize(name), parsed.protein_g, parsed.calories ?? null) as unknown as Food

  return { food, is_new: true, confidence: parsed.confidence, notes: parsed.notes }
}
