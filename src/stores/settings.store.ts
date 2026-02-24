import { defineStore } from 'pinia'
import { ref } from 'vue'
import { endpoints } from '@/api/endpoints.js'

export const useSettingsStore = defineStore('settings', () => {
  const goal = ref(90)
  const timezone = ref('America/Los_Angeles')
  const loaded = ref(false)

  async function fetchSettings() {
    const { settings } = await endpoints.getSettings()
    goal.value = parseFloat(settings.daily_goal_g ?? '90')
    timezone.value = settings.timezone ?? 'America/Los_Angeles'
    loaded.value = true
  }

  async function updateGoal(newGoal: number) {
    goal.value = newGoal
    await endpoints.updateSettings({ daily_goal_g: newGoal })
  }

  return { goal, timezone, loaded, fetchSettings, updateGoal }
})
