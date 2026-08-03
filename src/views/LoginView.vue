<template>
  <div class="min-h-dvh bg-bg text-text flex flex-col items-center justify-center gap-3 px-6 text-center">
    <h1 class="text-2xl font-semibold tracking-tight">Gram Reaper</h1>

    <p v-if="auth.notConfigured" class="text-danger text-sm max-w-xs">
      Access code isn't configured on the server. Set
      <code class="font-mono text-xs">APP_ACCESS_CODE</code>, then redeploy.
    </p>

    <template v-else>
      <p class="text-muted text-sm mb-5">Enter your access code</p>

      <form class="flex flex-col gap-3 w-full max-w-[15rem]" autocomplete="off" @submit.prevent="submit">
        <input
          ref="inputEl"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          spellcheck="false"
          :maxlength="auth.codeLength"
          :disabled="busy"
          aria-label="Access code"
          class="font-mono text-2xl font-semibold text-center tracking-[0.5em] indent-[0.5em] px-2 py-3
                 rounded-xl border-2 border-accent bg-surface text-text disabled:opacity-60"
          @input="onInput"
        />
        <button
          type="submit"
          :disabled="busy || code.length === 0"
          class="text-sm font-semibold px-4 py-3 rounded-xl bg-accent text-bg disabled:opacity-60"
        >
          {{ busy ? 'Checking…' : 'Unlock' }}
        </button>
      </form>

      <p v-if="error" class="text-danger text-sm max-w-xs mt-2">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'

const auth = useAuthStore()
const inputEl = ref<HTMLInputElement | null>(null)
const code = ref('')
const error = ref('')
const busy = ref(false)

onMounted(() => {
  if (!auth.notConfigured) inputEl.value?.focus()
})

function onInput() {
  // Digits only, and submit automatically once the expected length is reached.
  code.value = code.value.replace(/\D/g, '').slice(0, auth.codeLength)
  error.value = ''
  if (code.value.length === auth.codeLength) submit()
}

async function submit() {
  if (busy.value || !code.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.signInWithCode(code.value)
  } catch (err: any) {
    error.value = err?.message ?? 'Incorrect code.'
    code.value = ''
    await nextTick()
    inputEl.value?.focus()
  } finally {
    busy.value = false
  }
}
</script>
