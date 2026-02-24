<template>
  <teleport to="body">
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none"
         style="padding-bottom: env(safe-area-inset-bottom)">
      <transition-group name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto animate-toast-in px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border backdrop-blur-sm"
          :class="{
            'bg-surface border-accent/30 text-text': toast.type === 'success',
            'bg-surface border-danger/30 text-danger': toast.type === 'error',
            'bg-surface border-white/10 text-muted': toast.type === 'info'
          }"
        >
          {{ toast.message }}
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast.store.js'
const toastStore = useToastStore()
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.95); }
.toast-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
