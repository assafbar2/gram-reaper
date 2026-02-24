<template>
  <div v-if="cards.length > 0" class="space-y-2">
    <div class="flex items-center justify-between px-1">
      <span class="text-muted text-xs uppercase tracking-widest">Quick add</span>
      <span class="text-muted/50 text-xs">tap to log</span>
    </div>
    <div class="flex gap-2 overflow-x-auto pb-1" style="-webkit-overflow-scrolling: touch; scrollbar-width: none;">
      <QuickAddCard
        v-for="card in cards"
        :key="card.food_id"
        :card="card"
        @add="$emit('add', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QuickAddCard } from '@/types/index.js'
import QuickAddCardComponent from './QuickAddCard.vue'

// Rename to avoid name collision
const QuickAddCard = QuickAddCardComponent

defineProps<{ cards: QuickAddCard[] }>()
defineEmits<{ (e: 'add', foodId: number): void }>()
</script>

<style scoped>
div::-webkit-scrollbar { display: none; }
</style>
