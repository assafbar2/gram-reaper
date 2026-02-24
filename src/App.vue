<template>
  <div class="min-h-dvh bg-bg text-text">
    <router-view />

    <!-- Bottom navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-bg border-t border-white/5 flex justify-around items-center h-14 z-40"
         style="padding-bottom: env(safe-area-inset-bottom)">
      <router-link to="/" class="nav-item" :class="{ active: route.name === 'today' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="1.5"/>
          <path d="M12 6v6l4 2" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Today</span>
      </router-link>

      <router-link to="/history" class="nav-item" :class="{ active: route.name === 'history' || route.name === 'day-detail' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="1.5"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>History</span>
      </router-link>

      <router-link to="/settings" class="nav-item" :class="{ active: route.name === 'settings' }">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" stroke-width="1.5"/>
          <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Settings</span>
      </router-link>
    </nav>

    <!-- Toast container -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import ToastContainer from '@/components/shared/ToastContainer.vue'

const route = useRoute()
</script>

<style scoped>
.nav-item {
  @apply flex flex-col items-center gap-1 text-xs text-muted transition-colors duration-150 px-4 py-1;
}
.nav-item.active {
  @apply text-accent;
}
.nav-item svg {
  transition: stroke 0.15s;
}
.nav-item.active svg {
  stroke: #F5C518;
}
</style>
