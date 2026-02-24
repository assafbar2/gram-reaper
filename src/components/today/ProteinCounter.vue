<template>
  <div class="text-center space-y-1">
    <!-- Remaining / goal met message -->
    <p v-if="goalMet" class="text-accent font-medium text-sm tracking-wide">
      Goal secured.
    </p>
    <p v-else class="text-muted text-sm">
      <span class="text-text font-mono font-medium">{{ Math.round(remaining) }}g</span>
      to go
      <span v-if="gramDebt" class="text-muted"> &mdash; {{ gramDebt }}</span>
    </p>

    <!-- Time-based encouragement -->
    <p v-if="!goalMet && timeHint" class="text-muted text-xs">{{ timeHint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { QuickAddCard } from '@/types/index.js'

const props = defineProps<{
  total: number
  goal: number
  remaining: number
  quickadd: QuickAddCard[]
}>()

const goalMet = computed(() => props.total >= props.goal)

// "~2 eggs worth of protein remaining"
const gramDebt = computed(() => {
  if (props.remaining <= 0 || props.quickadd.length === 0) return null
  // Find the top quick-add item with a reasonable protein value
  const topCard = props.quickadd.find(c => c.protein_g >= 5 && c.protein_g <= 60)
  if (!topCard) return null
  const servings = props.remaining / topCard.protein_g
  const rounded = Math.round(servings * 10) / 10
  if (rounded > 5) return null // Too many servings, don't show
  const label = rounded === 1 ? `1 ${topCard.name}` : `~${rounded} × ${topCard.name}`
  return label
})

const timeHint = computed(() => {
  const hour = new Date().getHours()
  if (props.total === 0 && hour >= 10) return "Haven't started yet."
  if (hour >= 20 && props.remaining > 30) return 'Evening. Time to close the gap.'
  return null
})
</script>
