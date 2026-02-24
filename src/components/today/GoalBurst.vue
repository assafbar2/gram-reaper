<template>
  <teleport to="body">
    <transition name="burst">
      <div v-if="visible" class="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
        <!-- Radial burst rings -->
        <div class="relative">
          <div
            v-for="i in 3"
            :key="i"
            class="absolute rounded-full border-2 border-accent burst-ring"
            :style="{
              width: (80 + i * 60) + 'px',
              height: (80 + i * 60) + 'px',
              marginLeft: -((80 + i * 60) / 2) + 'px',
              marginTop: -((80 + i * 60) / 2) + 'px',
              animationDelay: (i * 0.1) + 's'
            }"
          />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ trigger: boolean }>()
const emit = defineEmits<{ (e: 'done'): void }>()

const visible = ref(false)

watch(() => props.trigger, (val) => {
  if (val) {
    visible.value = true
    setTimeout(() => {
      visible.value = false
      emit('done')
    }, 900)
  }
})
</script>

<style scoped>
.burst-ring {
  animation: burst-expand 0.9s ease-out forwards;
  opacity: 0;
}

@keyframes burst-expand {
  0%   { transform: scale(0.1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.burst-enter-active, .burst-leave-active { transition: opacity 0.2s; }
.burst-enter-from, .burst-leave-to { opacity: 0; }
</style>
