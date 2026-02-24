<template>
  <div class="min-h-dvh bg-bg pb-20 px-5 pt-6 space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-text font-bold text-xl tracking-tight">History</h1>
    </header>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center pt-12">
      <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Stats bar -->
      <div class="grid grid-cols-3 gap-3">
        <div class="surface-card p-3 text-center">
          <p class="text-accent font-mono font-bold text-xl">{{ store.streak }}</p>
          <p class="text-muted text-xs mt-1">streak</p>
        </div>
        <div class="surface-card p-3 text-center">
          <p class="text-text font-mono font-bold text-xl">{{ store.goalDays }}</p>
          <p class="text-muted text-xs mt-1">goals hit</p>
        </div>
        <div class="surface-card p-3 text-center">
          <p class="text-text font-mono font-bold text-xl">{{ store.bestDayG ? Math.round(store.bestDayG) : '—' }}<span class="text-muted text-sm">g</span></p>
          <p class="text-muted text-xs mt-1">best day</p>
        </div>
      </div>

      <!-- Calendar -->
      <HistoryCalendar :days="store.days" @select="goToDay" />

      <!-- Recent days list -->
      <div class="space-y-2">
        <span class="text-muted text-xs uppercase tracking-widest px-1">Recent</span>
        <div
          v-for="day in recentDays"
          :key="day.date"
          @click="goToDay(day.date)"
          class="surface-card px-4 py-3 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div>
            <p class="text-text text-sm font-medium">{{ formatDate(day.date) }}</p>
            <p class="text-muted text-xs mt-0.5">{{ day.entry_count }} item{{ day.entry_count !== 1 ? 's' : '' }}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="font-mono font-medium text-sm" :class="day.goal_met ? 'text-accent' : 'text-muted'">
                {{ Math.round(day.total_g) }}g
              </p>
              <p class="text-muted text-xs">/ {{ Math.round(day.goal_g) }}g</p>
            </div>
            <!-- Progress pill -->
            <div class="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="day.goal_met ? 'bg-accent' : 'bg-muted/40'"
                :style="{ width: Math.min(100, (day.total_g / day.goal_g) * 100) + '%' }"
              />
            </div>
          </div>
        </div>

        <div v-if="recentDays.length === 0" class="text-center py-8">
          <p class="text-muted text-sm">No history yet.</p>
          <p class="text-muted/60 text-xs mt-1">Start logging to see your record.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHistoryStore } from '@/stores/history.store.js'
import HistoryCalendar from '@/components/history/HistoryCalendar.vue'

const store = useHistoryStore()
const router = useRouter()

onMounted(() => store.fetchHistory())

const recentDays = computed(() => store.days.slice(0, 14))

function goToDay(date: string) {
  router.push(`/history/${date}`)
}

function formatDate(date: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>
