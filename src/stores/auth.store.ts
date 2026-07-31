import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, setUnauthenticatedHandler } from '@/api/client.js'

interface SessionResponse {
  authenticated: boolean
  email?: string | null
  google_client_id?: string
  code?: string
}

export const useAuthStore = defineStore('auth', () => {
  const ready = ref(false)
  const authenticated = ref(false)
  const email = ref<string | null>(null)
  // Supplied by the server at runtime, not baked into the bundle.
  const clientId = ref<string | null>(null)
  // True when the server is missing GOOGLE_CLIENT_ID / ALLOWED_EMAILS /
  // SESSION_SECRET — signing in is impossible, so say so rather than loop.
  const notConfigured = ref(false)

  async function check(): Promise<void> {
    try {
      const res = await api.get<SessionResponse>('/auth/session')
      authenticated.value = res.authenticated
      email.value = res.email ?? null
      clientId.value = res.google_client_id ?? null
      notConfigured.value = false
    } catch (err: any) {
      authenticated.value = false
      email.value = null
      notConfigured.value = err?.code === 'AUTH_NOT_CONFIGURED' || err?.status === 503
    } finally {
      ready.value = true
    }
  }

  // Exchange a Google ID token for a session cookie.
  async function signInWithGoogle(credential: string): Promise<void> {
    const res = await api.post<SessionResponse>('/auth/google', { credential })
    authenticated.value = res.authenticated
    email.value = res.email ?? null
  }

  async function signOut(): Promise<void> {
    try {
      await api.post('/auth/logout', {})
    } finally {
      authenticated.value = false
      email.value = null
      // Drop cached view state belonging to the previous session.
      window.location.reload()
    }
  }

  // Any 401 mid-session flips the app back to the sign-in screen.
  setUnauthenticatedHandler(() => {
    authenticated.value = false
    email.value = null
    ready.value = true
  })

  return { ready, authenticated, email, clientId, notConfigured, check, signInWithGoogle, signOut }
})
