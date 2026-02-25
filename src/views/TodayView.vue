<template>
  <div class="min-h-dvh bg-bg flex flex-col pb-28">
    <!-- Header -->
    <header class="flex items-center justify-between px-5 pt-6 pb-2">
      <div>
        <h1 class="text-text font-bold text-xl tracking-tight">Gram Reaper</h1>
        <p class="text-muted text-xs mt-0.5">{{ formattedDate }}</p>
      </div>
      <div v-if="streak > 0" class="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5">
        <span class="text-accent font-mono font-bold text-sm">{{ streak }}</span>
        <span class="text-accent/70 text-xs">day streak</span>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex-1 px-5 space-y-6 overflow-y-auto pb-40">

      <!-- Loading state -->
      <div v-if="store.loading && store.entries.length === 0" class="flex justify-center pt-16">
        <div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>

      <template v-else>
        <!-- Progress ring + counter -->
        <div class="flex flex-col items-center pt-4 gap-3">
          <ProgressRing
            :total="store.summary.total_g"
            :goal="store.summary.goal_g"
            :size="200"
            :just-hit-goal="store.justHitGoal"
          />
          <ProteinCounter
            :total="store.summary.total_g"
            :goal="store.summary.goal_g"
            :remaining="store.remaining"
            :quickadd="store.quickadd"
          />
        </div>

        <!-- Quick-add dock -->
        <QuickAddDock :cards="store.quickadd" @add="quickAdd" />

        <!-- Today's log -->
        <LogFeed :entries="store.entries" @delete="deleteEntry" />
      </template>
    </div>

    <!-- Input bar -->
    <InputBar :food-catalog="foodCatalog" @submit="openParseSheet" />

    <!-- Parse confirmation sheet -->
    <ParseConfirmSheet
      :open="sheetOpen"
      :loading="parsing"
      :result="parseResult"
      :error="parseError"
      @confirm="confirmAdd"
      @cancel="closeSheet"
    />

    <!-- Goal celebration -->
    <GoalBurst :trigger="store.justHitGoal" @done="store.clearGoalCelebration" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTodayStore } from '@/stores/today.store.js'
import { useHistoryStore } from '@/stores/history.store.js'
import { useToastStore } from '@/stores/toast.store.js'
import { endpoints } from '@/api/endpoints.js'
import type { Food, ParseResult } from '@/types/index.js'

import ProgressRing from '@/components/today/ProgressRing.vue'
import ProteinCounter from '@/components/today/ProteinCounter.vue'
import QuickAddDock from '@/components/today/QuickAddDock.vue'
import LogFeed from '@/components/today/LogFeed.vue'
import InputBar from '@/components/today/InputBar.vue'
import ParseConfirmSheet from '@/components/today/ParseConfirmSheet.vue'
import GoalBurst from '@/components/today/GoalBurst.vue'

const store = useTodayStore()
const historyStore = useHistoryStore()
const toast = useToastStore()

const foodCatalog = ref<Food[]>([])
const sheetOpen = ref(false)
const parsing = ref(false)
const parseResult = ref<ParseResult | null>(null)
const parseError = ref<string | null>(null)
const streak = computed(() => historyStore.streak)

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
})

onMounted(async () => {
  await store.fetchToday()
  historyStore.fetchHistory()
  // Load food catalog for client-side input hints
  try {
    const data = await endpoints.getFoods()
    foodCatalog.value = data.foods
  } catch { /* non-critical */ }
})

// Goal celebration toast
watch(() => store.justHitGoal, (val) => {
  if (val) {
    const s = historyStore.streak
    if (s >= 7) {
      toast.success(`${s} days straight. The Gram Reaper does not sleep.`)
    } else {
      toast.success('90g. Goal secured.')
    }
  }
})

async function quickAdd(foodId: number) {
  try {
    await store.addFood({ food_id: foodId })
    const card = store.quickadd.find(c => c.food_id === foodId)
    toast.success(`Logged. +${card ? Math.round(card.protein_g) : '?'}g added.`)
  } catch (e: any) {
    toast.error('Failed to log. Try again.')
  }
}

async function openParseSheet(input: string) {
  sheetOpen.value = true
  parsing.value = true
  parseResult.value = null
  parseError.value = null

  try {
    parseResult.value = await endpoints.parseFood(input)
  } catch (e: any) {
    parseError.value = e.message ?? 'Parse failed.'
  } finally {
    parsing.value = false
  }
}

async function confirmAdd(foodId: number, qty: number) {
  closeSheet()
  try {
    await store.addFood({ food_id: foodId, quantity: qty })
    const protein = parseResult.value ? Math.round(parseResult.value.food.protein_g * qty) : '?'
    toast.success(`Logged. +${protein}g added.`)
    // Refresh food catalog
    const data = await endpoints.getFoods()
    foodCatalog.value = data.foods
  } catch (e: any) {
    toast.error('Failed to log. Try again.')
  }
}

function closeSheet() {
  sheetOpen.value = false
  parseResult.value = null
  parseError.value = null
}

async function deleteEntry(id: number) {
  try {
    await store.removeEntry(id)
    toast.info('Removed.')
  } catch {
    toast.error('Could not remove.')
  }
}
</script>
