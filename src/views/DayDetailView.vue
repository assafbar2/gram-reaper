<template>
  <div class="min-h-dvh bg-bg pb-20 px-5 pt-6 space-y-5">
    <header class="flex items-center gap-3">
      <button @click="router.back()" class="text-muted hover:text-text transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1 class="text-text font-bold text-xl">{{ formattedDate }}</h1>
    </header>

    <div v-if="loading" class="flex justify-center pt-12">
      <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Summary -->
      <div v-if="summary" class="surface-card p-4 flex items-center justify-between">
        <div>
          <p class="text-text font-mono font-bold text-2xl">{{ Math.round(summary.total_g) }}<span class="text-muted text-sm">g</span></p>
          <p class="text-muted text-xs mt-1">of {{ Math.round(summary.goal_g) }}g goal</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="px-3 py-1 rounded-lg text-sm font-medium"
            :class="summary.goal_met ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'"
          >
            {{ summary.goal_met ? 'Goal met' : 'Missed' }}
          </span>
        </div>
      </div>

      <!-- Entries -->
      <div class="space-y-2">
        <span class="text-muted text-xs uppercase tracking-widest px-1">Items</span>
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="surface-card px-4 py-3 flex items-center justify-between"
        >
          <div class="flex-1 min-w-0">
            <p class="text-text text-sm truncate">{{ entry.food_name }}</p>
            <p class="text-muted text-xs mt-0.5">{{ formatTime(entry.logged_at) }}</p>
          </div>
          <span class="protein-badge ml-3">{{ Math.round(entry.protein_g) }}g</span>
        </div>

        <div v-if="entries.length === 0" class="text-center py-8">
          <p class="text-muted text-sm">No entries found.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { endpoints } from '@/api/endpoints.js'
import type { LogEntry, DailySummary } from '@/types/index.js'

const route = useRoute()
const router = useRouter()
const date = route.params.date as string

const entries = ref<LogEntry[]>([])
const summary = ref<DailySummary | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await endpoints.getHistoryDay(date)
    entries.value = data.entries
    summary.value = data.summary
  } finally {
    loading.value = false
  }
})

const formattedDate = computed(() =>
  new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
)

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>
