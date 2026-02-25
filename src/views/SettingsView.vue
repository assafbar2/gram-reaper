<template>
  <div class="min-h-dvh bg-bg pb-20 px-5 pt-6 space-y-6">
    <header>
      <h1 class="text-text font-bold text-xl tracking-tight">Settings</h1>
    </header>

    <!-- Goal -->
    <div class="surface-card p-4 space-y-4">
      <h2 class="text-text text-sm font-medium">Daily Goal</h2>
      <div class="flex items-center gap-4">
        <input
          v-model.number="goalInput"
          type="number"
          min="10"
          max="500"
          step="5"
          class="w-24 bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-text font-mono text-center focus:outline-none focus:border-accent/50"
        />
        <span class="text-muted text-sm">grams / day</span>
        <button @click="saveGoal" :disabled="saving" class="btn-primary px-4 py-2 text-sm ml-auto">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Export -->
    <div class="surface-card p-4 space-y-3">
      <h2 class="text-text text-sm font-medium">Export</h2>
      <p class="text-muted text-xs">Download your full protein log as plain text.</p>
      <button @click="exportLog" class="btn-ghost text-sm border border-white/10 rounded-lg px-4 py-2">
        Export log (.txt)
      </button>
    </div>

    <!-- Reset -->
    <div class="surface-card p-4 space-y-3">
      <h2 class="text-text text-sm font-medium">Reset</h2>
      <p class="text-muted text-xs">Wipes all logs, history, and the food cache (quick-add cards). Cannot be undone.</p>
      <button
        v-if="!confirmingReset"
        @click="confirmingReset = true"
        class="text-danger text-sm border border-danger/30 rounded-lg px-4 py-2 hover:bg-danger/10 transition-colors"
      >
        Clear all history
      </button>
      <div v-else class="flex gap-3">
        <button @click="confirmingReset = false" class="btn-ghost text-sm border border-white/10 rounded-lg px-4 py-2">
          Cancel
        </button>
        <button @click="doReset" :disabled="resetting" class="text-danger text-sm border border-danger/50 bg-danger/10 rounded-lg px-4 py-2">
          {{ resetting ? 'Clearing...' : 'Yes, clear everything' }}
        </button>
      </div>
    </div>

    <!-- About -->
    <div class="surface-card p-4 space-y-2">
      <h2 class="text-text text-sm font-medium">About</h2>
      <p class="text-muted text-xs leading-relaxed">
        Gram Reaper — open source protein tracker.<br/>
        Built with Vue 3 + Express + SQLite.<br/>
        AI parsing powered by Claude.
      </p>
      <a
        href="https://github.com/assafbar2/gram-reaper"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5 text-accent text-xs hover:underline mt-1"
      >
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        assafbar2/gram-reaper
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings.store.js'
import { useToastStore } from '@/stores/toast.store.js'
import { endpoints } from '@/api/endpoints.js'

const settings = useSettingsStore()
const toast = useToastStore()
const goalInput = ref(90)
const saving = ref(false)
const confirmingReset = ref(false)
const resetting = ref(false)

onMounted(async () => {
  await settings.fetchSettings()
  goalInput.value = settings.goal
})

async function saveGoal() {
  saving.value = true
  try {
    await settings.updateGoal(goalInput.value)
    toast.success(`Goal updated to ${goalInput.value}g.`)
  } catch {
    toast.error('Failed to save.')
  } finally {
    saving.value = false
  }
}

async function doReset() {
  resetting.value = true
  try {
    await endpoints.resetData()
    confirmingReset.value = false
    toast.success('All data cleared.')
  } catch {
    toast.error('Reset failed.')
  } finally {
    resetting.value = false
  }
}

async function exportLog() {
  try {
    const { days } = await endpoints.getHistory(365)
    const lines: string[] = ['GRAM REAPER - Protein Log Export', `Generated: ${new Date().toISOString().slice(0, 10)}`, '']

    for (const day of [...days].reverse()) {
      const status = day.goal_met ? `GOAL MET — ${Math.round(day.total_g)}g` : `${Math.round(day.total_g)}g / ${Math.round(day.goal_g)}g`
      lines.push(`${day.date} (${status})`)

      const { entries } = await endpoints.getHistoryDay(day.date)
      for (const e of entries) {
        const time = new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        lines.push(`  ${time}  ${e.food_name.padEnd(30)} ${Math.round(e.protein_g)}g`)
      }
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gram-reaper-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Export failed.')
  }
}
</script>
