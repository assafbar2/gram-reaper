<template>
  <button
    @click="handleTap"
    class="surface-card flex-shrink-0 flex flex-col justify-between p-3 active:scale-95 transition-all duration-150 text-left"
    :class="{
      'opacity-50': card.logged_today,
      'border-accent/20': card.logged_today
    }"
    style="min-width: 120px; min-height: 80px;"
  >
    <!-- Ghost indicator -->
    <div v-if="card.logged_today" class="flex items-center gap-1 mb-1">
      <div class="w-1.5 h-1.5 rounded-full bg-accent/60" />
      <span class="text-accent/60 text-xs">logged</span>
    </div>

    <span class="text-text text-sm font-medium leading-tight line-clamp-2 flex-1">{{ card.name }}</span>

    <div class="flex items-center justify-between mt-2">
      <span class="protein-badge">{{ Math.round(card.protein_g) }}g</span>
      <span class="text-muted/50 text-xs">×{{ card.total_logs }}</span>
    </div>

    <!-- Tap ripple feedback -->
    <div v-if="tapped" class="absolute inset-0 rounded-xl bg-accent/10 pointer-events-none animate-ping" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { QuickAddCard } from '@/types/index.js'

const props = defineProps<{ card: QuickAddCard }>()
const emit = defineEmits<{ (e: 'add', foodId: number): void }>()

const tapped = ref(false)

function handleTap() {
  tapped.value = true
  emit('add', props.card.food_id)
  setTimeout(() => { tapped.value = false }, 400)
}
</script>
