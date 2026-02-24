import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { endpoints } from '@/api/endpoints.js'
import type { LogEntry, DailySummary, QuickAddCard } from '@/types/index.js'

export const useTodayStore = defineStore('today', () => {
  const entries = ref<LogEntry[]>([])
  const summary = ref<DailySummary>({
    date: '',
    total_g: 0,
    goal_g: 90,
    goal_met: 0,
    entry_count: 0,
    updated_at: ''
  })
  const quickadd = ref<QuickAddCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Track whether we just hit the goal this session (for celebration)
  const justHitGoal = ref(false)

  const progress = computed(() => {
    const pct = summary.value.goal_g > 0
      ? Math.min(1, summary.value.total_g / summary.value.goal_g)
      : 0
    return pct
  })

  const remaining = computed(() => Math.max(0, summary.value.goal_g - summary.value.total_g))

  async function fetchToday() {
    loading.value = true
    error.value = null
    try {
      const data = await endpoints.getToday()
      const prevGoalMet = summary.value.goal_met
      entries.value = data.entries
      summary.value = data.summary
      quickadd.value = data.quickadd
      // Trigger celebration if we just crossed the goal
      if (!prevGoalMet && data.summary.goal_met) justHitGoal.value = true
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addFood(body: { food_id?: number; raw_input?: string; quantity?: number }) {
    const prevGoalMet = summary.value.goal_met
    // Optimistic update: add a temporary entry
    const tempId = -(Date.now())
    const foodName = body.food_id
      ? (quickadd.value.find(q => q.food_id === body.food_id)?.name ?? 'Food')
      : (body.raw_input ?? 'Food')
    const tempProtein = body.food_id
      ? (quickadd.value.find(q => q.food_id === body.food_id)?.protein_g ?? 0) * (body.quantity ?? 1)
      : 0

    if (body.food_id && tempProtein > 0) {
      entries.value.unshift({
        id: tempId,
        food_id: body.food_id,
        food_name: foodName,
        logged_date: summary.value.date,
        logged_at: new Date().toISOString(),
        quantity: body.quantity ?? 1,
        protein_g: tempProtein,
        raw_input: null
      })
      summary.value = {
        ...summary.value,
        total_g: summary.value.total_g + tempProtein,
        entry_count: summary.value.entry_count + 1,
        goal_met: summary.value.total_g + tempProtein >= summary.value.goal_g ? 1 : 0
      }
    }

    try {
      const result = await endpoints.logFood(body)
      // Replace temp with real entry
      const idx = entries.value.findIndex(e => e.id === tempId)
      if (idx >= 0) {
        entries.value[idx] = result.entry
      } else {
        entries.value.unshift(result.entry)
      }
      summary.value = result.summary
      // Update quick-add card logged_today flag
      if (body.food_id) {
        const card = quickadd.value.find(q => q.food_id === body.food_id)
        if (card) card.logged_today = true
      }
      // Trigger goal celebration
      if (!prevGoalMet && result.summary.goal_met) justHitGoal.value = true
    } catch (e: any) {
      // Rollback optimistic update
      entries.value = entries.value.filter(e => e.id !== tempId)
      await fetchToday() // re-sync
      throw e
    }
  }

  async function removeEntry(id: number) {
    // Optimistic remove
    const removed = entries.value.find(e => e.id === id)
    entries.value = entries.value.filter(e => e.id !== id)
    if (removed) {
      summary.value = {
        ...summary.value,
        total_g: Math.max(0, summary.value.total_g - removed.protein_g),
        entry_count: summary.value.entry_count - 1,
        goal_met: summary.value.total_g - removed.protein_g >= summary.value.goal_g ? 1 : 0
      }
    }

    try {
      const result = await endpoints.deleteLog(id)
      summary.value = result.summary
    } catch (e: any) {
      await fetchToday()
      throw e
    }
  }

  function clearGoalCelebration() {
    justHitGoal.value = false
  }

  return {
    entries,
    summary,
    quickadd,
    loading,
    error,
    progress,
    remaining,
    justHitGoal,
    fetchToday,
    addFood,
    removeEntry,
    clearGoalCelebration
  }
})
