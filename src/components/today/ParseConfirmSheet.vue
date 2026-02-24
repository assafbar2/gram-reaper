<template>
  <teleport to="body">
    <transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex flex-col justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('cancel')" />

        <!-- Sheet -->
        <div class="relative bg-surface rounded-t-2xl border-t border-white/10 p-5 space-y-4">
          <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />

          <div v-if="loading" class="flex flex-col items-center py-6 gap-3">
            <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p class="text-muted text-sm">Parsing...</p>
          </div>

          <div v-else-if="result" class="space-y-4">
            <div class="surface-card p-4 space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-text font-medium">{{ result.food.name }}</p>
                  <p class="text-muted text-xs mt-1">{{ result.notes }}</p>
                </div>
                <span class="protein-badge shrink-0 text-base px-3 py-1">{{ Math.round(result.food.protein_g) }}g</span>
              </div>

              <!-- Confidence indicator -->
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="result.confidence >= 0.7 ? 'bg-accent' : result.confidence >= 0.4 ? 'bg-yellow-600' : 'bg-danger'"
                    :style="{ width: (result.confidence * 100) + '%' }"
                  />
                </div>
                <span class="text-muted text-xs">{{ confidenceLabel }}</span>
              </div>
            </div>

            <!-- Quantity adjustment -->
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm">Quantity</span>
              <div class="flex items-center gap-3">
                <button @click="qty = Math.max(0.5, qty - 0.5)" class="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center text-text btn-ghost">−</button>
                <span class="text-text font-mono w-8 text-center">{{ qty === Math.floor(qty) ? qty : qty.toFixed(1) }}</span>
                <button @click="qty += 0.5" class="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center text-text btn-ghost">+</button>
              </div>
            </div>

            <div class="text-center text-muted text-sm">
              Total: <span class="text-text font-mono font-medium">{{ Math.round(result.food.protein_g * qty) }}g</span> protein
            </div>

            <div class="flex gap-3">
              <button @click="$emit('cancel')" class="flex-1 py-3 rounded-xl border border-white/10 text-muted text-sm active:scale-95 transition-all">
                Cancel
              </button>
              <button @click="confirm" class="flex-1 btn-primary py-3 text-sm">
                Add {{ Math.round(result.food.protein_g * qty) }}g
              </button>
            </div>
          </div>

          <div v-else-if="error" class="space-y-4">
            <p class="text-danger text-sm text-center">{{ error }}</p>
            <button @click="$emit('cancel')" class="w-full py-3 rounded-xl border border-white/10 text-muted text-sm">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ParseResult } from '@/types/index.js'

const props = defineProps<{
  open: boolean
  loading: boolean
  result: ParseResult | null
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'confirm', foodId: number, qty: number): void
  (e: 'cancel'): void
}>()

const qty = ref(1)

watch(() => props.open, (v) => { if (v) qty.value = 1 })

const confidenceLabel = computed(() => {
  if (!props.result) return ''
  const c = props.result.confidence
  if (c >= 0.8) return 'High confidence'
  if (c >= 0.5) return 'Estimated'
  return 'Low confidence'
})

function confirm() {
  if (props.result) {
    emit('confirm', props.result.food.id, qty.value)
  }
}
</script>

<style scoped>
.sheet-enter-active .sheet-leave-active { transition: all 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from > div:last-child, .sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>
