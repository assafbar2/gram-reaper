<template>
  <div class="fixed bottom-14 left-0 right-0 z-30 px-4 pb-2"
       style="padding-bottom: calc(0.5rem + env(safe-area-inset-bottom))">

    <!-- Live estimate hint -->
    <transition name="hint">
      <div v-if="liveMatch && input.trim().length > 0"
           class="mb-2 px-3 py-1.5 bg-surface/80 backdrop-blur border border-white/5 rounded-lg flex items-center justify-between">
        <span class="text-muted text-xs truncate">{{ liveMatch.name }}</span>
        <span class="text-accent/70 text-xs font-mono ml-2">~{{ Math.round(liveMatch.protein_g) }}g</span>
      </div>
    </transition>

    <form @submit.prevent="submit" class="flex gap-2">
      <input
        ref="inputRef"
        v-model="input"
        type="text"
        placeholder="Add anything..."
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        class="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-accent/50 transition-colors"
      />
      <button
        type="submit"
        :disabled="!input.trim()"
        class="w-12 h-12 bg-accent rounded-xl flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
      >
        <svg class="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12l7-7 7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Food } from '@/types/index.js'

const props = defineProps<{ foodCatalog: Food[] }>()
const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const input = ref('')
const inputRef = ref<HTMLInputElement>()

// Client-side live match: normalize and check food catalog
const liveMatch = computed(() => {
  const q = input.value.toLowerCase().trim()
  if (q.length < 2) return null
  return props.foodCatalog.find(f =>
    f.name_normalized.includes(q) || q.includes(f.name_normalized.substring(0, 5))
  ) ?? null
})

function submit() {
  const val = input.value.trim()
  if (!val) return
  emit('submit', val)
  input.value = ''
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<style scoped>
.hint-enter-active, .hint-leave-active { transition: all 0.2s ease; }
.hint-enter-from, .hint-leave-to { opacity: 0; transform: translateY(4px); }
</style>
