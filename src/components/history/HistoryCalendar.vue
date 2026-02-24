<template>
  <div class="space-y-4">
    <!-- Month label -->
    <div class="flex items-center justify-between px-1">
      <span class="text-muted text-xs uppercase tracking-widest">{{ monthLabel }}</span>
    </div>

    <!-- Day-of-week header -->
    <div class="grid grid-cols-7 gap-1 text-center">
      <span v-for="d in ['S','M','T','W','T','F','S']" :key="d + Math.random()" class="text-muted/50 text-xs">{{ d }}</span>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
      <!-- Empty cells before first day of month -->
      <div v-for="_ in firstDayOfWeek" :key="'e' + _" />

      <!-- Day cells -->
      <button
        v-for="day in daysInMonth"
        :key="day.date"
        @click="day.hasData && $emit('select', day.date)"
        class="aspect-square rounded-lg flex items-center justify-center text-xs font-mono transition-all"
        :class="dayClass(day)"
        :disabled="!day.hasData"
      >
        {{ day.num }}
      </button>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 px-1 pt-1">
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-accent/80" />
        <span class="text-muted text-xs">Goal met</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-danger/40" />
        <span class="text-muted text-xs">Missed</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-white/10" />
        <span class="text-muted text-xs">No data</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailySummary } from '@/types/index.js'

const props = defineProps<{
  days: DailySummary[]
  month?: string  // 'YYYY-MM', defaults to current month
}>()

defineEmits<{ (e: 'select', date: string): void }>()

const targetMonth = computed(() => props.month ?? new Date().toISOString().slice(0, 7))

const monthLabel = computed(() => {
  const [year, month] = targetMonth.value.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const firstDayOfMonth = computed(() => new Date(targetMonth.value + '-01'))
const firstDayOfWeek = computed(() => firstDayOfMonth.value.getDay()) // 0=Sun

const totalDays = computed(() => {
  const [year, month] = targetMonth.value.split('-')
  return new Date(parseInt(year), parseInt(month), 0).getDate()
})

const summaryMap = computed(() => {
  const map = new Map<string, DailySummary>()
  for (const d of props.days) map.set(d.date, d)
  return map
})

interface CalendarDay {
  date: string
  num: number
  hasData: boolean
  goalMet: boolean
  totalG: number
  isToday: boolean
}

const daysInMonth = computed((): CalendarDay[] => {
  const today = new Date().toISOString().slice(0, 10)
  const result: CalendarDay[] = []
  for (let i = 1; i <= totalDays.value; i++) {
    const date = `${targetMonth.value}-${String(i).padStart(2, '0')}`
    const summary = summaryMap.value.get(date)
    result.push({
      date,
      num: i,
      hasData: !!summary,
      goalMet: summary?.goal_met === 1,
      totalG: summary?.total_g ?? 0,
      isToday: date === today
    })
  }
  return result
})

function dayClass(day: CalendarDay): string {
  if (day.isToday) return 'ring-1 ring-accent/50 bg-surface text-text'
  if (!day.hasData) return 'text-muted/30'
  if (day.goalMet) {
    // Gradient intensity by how much over goal
    return 'bg-accent text-black font-bold'
  }
  return 'bg-danger/30 text-danger/80'
}
</script>
