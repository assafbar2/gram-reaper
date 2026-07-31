<template>
  <div class="min-h-dvh bg-bg text-text flex flex-col items-center justify-center gap-3 px-6 text-center">
    <h1 class="text-2xl font-semibold tracking-tight">Gram Reaper</h1>
    <p class="text-muted text-sm mb-6">Harvest your daily protein.</p>

    <p v-if="auth.notConfigured" class="text-danger text-sm max-w-xs">
      Sign-in isn't configured on the server. Set
      <code class="font-mono text-xs">GOOGLE_CLIENT_ID</code>,
      <code class="font-mono text-xs">ALLOWED_EMAILS</code>, and
      <code class="font-mono text-xs">SESSION_SECRET</code>, then redeploy.
    </p>

    <template v-else>
      <!-- Google Identity Services renders its button into this element -->
      <div ref="buttonEl" class="min-h-[44px]"></div>
      <p v-if="error" class="text-danger text-sm max-w-xs mt-2">{{ error }}</p>
      <p v-else-if="busy" class="text-muted text-sm mt-2">Signing in…</p>
      <p v-else-if="!scriptReady" class="text-muted text-sm mt-2">Loading sign-in…</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'

const auth = useAuthStore()
const buttonEl = ref<HTMLElement | null>(null)
const error = ref('')
const busy = ref(false)
const scriptReady = ref(false)

const GSI_SRC = 'https://accounts.google.com/gsi/client'

function loadGsi(): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
  if (existing) {
    return (window as any).google?.accounts
      ? Promise.resolve()
      : new Promise(resolve => existing.addEventListener('load', () => resolve()))
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(script)
  })
}

async function handleCredential(response: { credential: string }) {
  busy.value = true
  error.value = ''
  try {
    await auth.signInWithGoogle(response.credential)
  } catch (err: any) {
    error.value = err?.message ?? 'Sign-in failed.'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  if (auth.notConfigured) return
  if (!auth.clientId) {
    error.value = 'Server did not provide a Google client ID.'
    return
  }
  try {
    await loadGsi()
    const google = (window as any).google
    google.accounts.id.initialize({ client_id: auth.clientId, callback: handleCredential })
    if (buttonEl.value) {
      google.accounts.id.renderButton(buttonEl.value, {
        type: 'standard',
        theme: 'filled_black',
        text: 'signin_with',
        shape: 'pill',
        size: 'large'
      })
    }
    scriptReady.value = true
  } catch (err: any) {
    error.value = err?.message ?? 'Could not load Google sign-in.'
  }
})
</script>
