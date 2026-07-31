import OpenAI, {
  APIError,
  APIConnectionError,
  AuthenticationError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError
} from 'openai'

// OpenRouter exposes an OpenAI-compatible Chat Completions API, so the official
// `openai` client works as-is once pointed at their base URL.
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// xAI's latest Grok. Supports structured outputs, which we rely on below.
// Override with OPENROUTER_MODEL to try another model without a code change.
export const PARSE_MODEL = process.env.OPENROUTER_MODEL?.trim() || 'x-ai/grok-4.5'

// The placeholder shipped in .env.example — copying the file without editing it
// is the most common way to end up "configured" but broken.
const PLACEHOLDER_KEY = 'sk-or-v1-your-key-here'

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'OPENROUTER_API_KEY is not set. Add it to .env for local dev, ' +
      'or set it as a secret on your host (e.g. `fly secrets set OPENROUTER_API_KEY=sk-or-v1-...`). ' +
      'Get a key at https://openrouter.ai/settings/keys'
    )
    this.name = 'MissingApiKeyError'
  }
}

function readApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key || key === PLACEHOLDER_KEY) return undefined
  return key
}

export function isApiKeyConfigured(): boolean {
  return readApiKey() !== undefined
}

let client: OpenAI | undefined

// Constructed lazily so a missing key doesn't take down the whole server at
// import time — quick-add and direct gram entry work fine without the LLM.
export function getLlmClient(): OpenAI {
  const apiKey = readApiKey()
  if (!apiKey) throw new MissingApiKeyError()
  client ??= new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    // Optional OpenRouter attribution headers — they surface the app name on
    // your OpenRouter activity page. Harmless if OPENROUTER_SITE_URL is unset.
    defaultHeaders: {
      'X-Title': 'Gram Reaper',
      ...(process.env.OPENROUTER_SITE_URL
        ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL }
        : {})
    }
  })
  return client
}

export interface ApiErrorResponse {
  status: number
  body: { error: string; code: string }
}

// Maps SDK error classes to actionable client messages. Uses the SDK's typed
// errors rather than matching on message text, which silently rots.
export function describeLlmError(err: unknown, fallback: string): ApiErrorResponse {
  if (err instanceof MissingApiKeyError) {
    return {
      status: 503,
      body: { error: 'OPENROUTER_API_KEY is not configured on the server.', code: 'API_KEY_MISSING' }
    }
  }
  if (err instanceof AuthenticationError) {
    return {
      status: 502,
      body: { error: 'OPENROUTER_API_KEY is invalid or revoked — issue a new key.', code: 'API_KEY_INVALID' }
    }
  }
  // OpenRouter signals an exhausted credit balance with 402 Payment Required,
  // which the SDK surfaces as a plain APIError rather than a dedicated class.
  if (err instanceof APIError && err.status === 402) {
    return {
      status: 502,
      body: {
        error: 'OpenRouter credits exhausted — top up at openrouter.ai/settings/credits',
        code: 'BILLING_ERROR'
      }
    }
  }
  if (err instanceof PermissionDeniedError) {
    return {
      status: 502,
      body: {
        error: `This OpenRouter key is not permitted to use ${PARSE_MODEL}.`,
        code: 'API_KEY_FORBIDDEN'
      }
    }
  }
  if (err instanceof NotFoundError) {
    return {
      status: 502,
      body: { error: `Model "${PARSE_MODEL}" is not available on OpenRouter.`, code: 'MODEL_NOT_FOUND' }
    }
  }
  if (err instanceof RateLimitError) {
    return { status: 429, body: { error: 'Rate limited by OpenRouter — try again shortly.', code: 'RATE_LIMITED' } }
  }
  if (err instanceof APIConnectionError) {
    return { status: 504, body: { error: 'Could not reach OpenRouter.', code: 'UPSTREAM_UNREACHABLE' } }
  }
  if (err instanceof APIError) {
    return {
      status: 502,
      body: { error: `OpenRouter API error (${err.status ?? 'unknown'}).`, code: 'UPSTREAM_ERROR' }
    }
  }
  return { status: 500, body: { error: fallback, code: 'SERVER_ERROR' } }
}
