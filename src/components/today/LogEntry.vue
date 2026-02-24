<template>
  <div
    class="relative overflow-hidden"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Delete reveal (swipe left) -->
    <div
      class="absolute right-0 top-0 bottom-0 bg-danger flex items-center justify-center px-5 rounded-r-xl"
      :style="{ width: Math.max(0, -swipeX) + 'px', transition: swiping ? 'none' : 'width 0.2s ease' }"
    >
      <svg v-if="-swipeX > 40" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <!-- Entry content -->
    <div
      class="relative bg-surface border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between transition-transform duration-200"
      :style="{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.2s ease' }"
    >
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-text text-sm font-medium truncate">{{ entry.food_name }}</span>
        <span class="text-muted text-xs mt-0.5">{{ formattedTime }}</span>
      </div>
      <div class="flex items-center gap-3 ml-3">
        <span class="protein-badge">+{{ Math.round(entry.protein_g) }}g</span>
        <button @click.stop="$emit('delete', entry.id)" class="text-muted hover:text-danger transition-colors p-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LogEntry } from '@/types/index.js'

const props = defineProps<{ entry: LogEntry }>()
const emit = defineEmits<{ (e: 'delete', id: number): void }>()

const swipeX = ref(0)
const swiping = ref(false)
let startX = 0

const formattedTime = computed(() => {
  return new Date(props.entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function onTouchStart(e: TouchEvent) {
  startX = e.touches[0].clientX
  swiping.value = true
}

function onTouchMove(e: TouchEvent) {
  const dx = e.touches[0].clientX - startX
  swipeX.value = Math.min(0, dx) // only left swipe
}

function onTouchEnd() {
  swiping.value = false
  if (swipeX.value < -80) {
    emit('delete', props.entry.id)
  }
  swipeX.value = 0
}
</script>
