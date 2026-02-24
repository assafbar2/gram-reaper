import { defineStore } from 'pinia'
import { ref } from 'vue'
import { endpoints } from '@/api/endpoints.js'
import type { DailySummary, HistoryResponse } from '@/types/index.js'

export const useHistoryStore = defineStore('history', () => {
  const days = ref<DailySummary[]>([])
  const streak = ref(0)
  const bestDayG = ref(0)
  const goalDays = ref(0)
  const totalLoggedDays = ref(0)
  const loading = ref(false)

  async function fetchHistory() {
    loading.value = true
    try {
      const data = await endpoints.getHistory(90)
      days.value = data.days
      streak.value = data.streak
      bestDayG.value = data.best_day_g
      goalDays.value = data.goal_days
      totalLoggedDays.value = data.total_logged_days
    } finally {
      loading.value = false
    }
  }

  return { days, streak, bestDayG, goalDays, totalLoggedDays, loading, fetchHistory }
})
