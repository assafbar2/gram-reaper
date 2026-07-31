const BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

// Notified when the server says we're no longer signed in, so the UI can swap
// to the sign-in screen instead of surfacing a wall of failed requests.
type UnauthenticatedHandler = () => void
let onUnauthenticated: UnauthenticatedHandler | null = null

export function setUnauthenticatedHandler(handler: UnauthenticatedHandler): void {
  onUnauthenticated = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    // Send the session cookie. Required in dev, where the client is served
    // from :5173 and the API from :3001 (cross-origin).
    credentials: 'include'
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401 || json.code === 'AUTH_NOT_CONFIGURED') {
      onUnauthenticated?.()
    }
    throw new ApiError(res.status, json.code ?? 'UNKNOWN', json.error ?? 'Request failed')
  }

  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  // Body is optional: the reset endpoint requires a confirmation payload.
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body)
}
