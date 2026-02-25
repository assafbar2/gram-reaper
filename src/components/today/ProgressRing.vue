<template>
  <div class="relative flex items-center justify-center select-none" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- Glow when goal met -->
    <div
      v-if="goalMet"
      class="absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-1000"
      style="background: radial-gradient(circle, #1A1400 0%, transparent 70%)"
    />

    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="transition-all duration-700"
      :class="{ 'animate-ring-pulse': justHitGoal }"
    >
      <!-- Track (background circle) -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        stroke="#8B7200"
        :stroke-width="strokeWidth"
      />

      <!-- Progress arc -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="ringColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90)"
        :transform-origin="`${center} ${center}`"
        style="transition: stroke-dashoffset 0.6s ease, stroke 0.5s ease"
      />

      <!-- Dot at the tip of the arc (optional, shows when >5%) -->
      <circle
        v-if="progress > 0.05"
        :cx="dotX"
        :cy="dotY"
        r="5"
        :fill="ringColor"
        style="transition: all 0.6s ease"
      />
    </svg>

    <!-- Center text -->
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="font-mono font-bold text-text leading-none" :style="{ fontSize: size * 0.18 + 'px' }">
        {{ goalMet ? '✓' : Math.round(remaining) }}<span v-if="!goalMet" class="text-muted" :style="{ fontSize: size * 0.07 + 'px' }">g</span>
      </span>
      <span class="text-muted mt-1" :style="{ fontSize: size * 0.065 + 'px' }">
        {{ goalMet ? 'goal met' : 'left' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  total: number
  goal: number
  size?: number
  justHitGoal?: boolean
}>(), {
  size: 200,
  justHitGoal: false
})

const strokeWidth = computed(() => props.size * 0.065)
const radius = computed(() => (props.size - strokeWidth.value) / 2)
const center = computed(() => props.size / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const progress = computed(() => Math.min(1, props.total / props.goal))
const goalMet = computed(() => progress.value >= 1)
const remaining = computed(() => Math.max(0, props.goal - props.total))

const dashOffset = computed(() => circumference.value * (1 - progress.value))

// Color transitions: 0-60% gray, 60-99% yellow, 100%+ bright gold
const ringColor = computed(() => {
  if (progress.value >= 1) return '#0D0A00'
  if (progress.value >= 0.6) return '#2A1F00'
  return '#7A6200'
})

// Position of the dot at the tip of the arc
const dotAngle = computed(() => (progress.value * 360 - 90) * (Math.PI / 180))
const dotX = computed(() => center.value + radius.value * Math.cos(dotAngle.value))
const dotY = computed(() => center.value + radius.value * Math.sin(dotAngle.value))
</script>
