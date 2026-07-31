import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, setUnauthenticatedHandler } from '@/api/client.js'

interface SessionResponse {
  authenticated: boolean
  code_length?: number
  code?: string
}

export const useAuthStore = defineStore('auth', () => {
  const ready = ref(false)
  const authenticated = ref(false)
  // How many boxes to draw. Not a secret — the client has to know the length.
  const codeLength = ref(4)
  // True when the server is missing APP_ACCESS_CODE / SESSION_SECRET, so
  // signing in is impossible — say so rather than loop on failures.
  const notConfigured = ref(false)

  async function check(): Promise<void> {
    try {
      const res = await api.get<SessionResponse>('/auth/session')
      authenticated.value = res.authenticated
      if (res.code_length) codeLength.value = res.code_length
      notConfigured.value = false
    } catch (err: any) {
      authenticated.value = false
      notConfigured.value = err?.code === 'AUTH_NOT_CONFIGURED' || err?.status === 503
    } finally {
      ready.value = true
    }
  }

  // Exchange the access code for a session cookie. Throws ApiError on refusal
  // so the view can show the server's message (including lockout wait times).
  async function signInWithCode(code: string): Promise<void> {
    const res = await api.post<SessionResponse>('/auth/code', { code })
    authenticated.value = res.authenticated
  }

  async function signOut(): Promise<void> {
    try {
      await api.post('/auth/logout', {})
    } finally {
      authenticated.value = false
      // Drop cached view state belonging to the previous session.
      window.location.reload()
    }
  }

  // Any 401 mid-session flips the app back to the code screen.
  setUnauthenticatedHandler(() => {
    authenticated.value = false
    ready.value = true
  })

  return { ready, authenticated, codeLength, notConfigured, check, signInWithCode, signOut }
})
