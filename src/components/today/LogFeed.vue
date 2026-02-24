<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between px-1 mb-3">
      <span class="text-muted text-xs uppercase tracking-widest">Today's log</span>
      <span v-if="entries.length > 0" class="text-muted text-xs">{{ entries.length }} item{{ entries.length !== 1 ? 's' : '' }}</span>
    </div>

    <transition-group name="entry" tag="div" class="space-y-2">
      <LogEntryRow
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @delete="$emit('delete', $event)"
      />
    </transition-group>

    <div v-if="entries.length === 0" class="text-center py-8">
      <p class="text-muted text-sm">Nothing logged yet.</p>
      <p class="text-muted/60 text-xs mt-1">Tap a card above or type below.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LogEntry } from '@/types/index.js'
import LogEntryRow from './LogEntry.vue'

defineProps<{ entries: LogEntry[] }>()
defineEmits<{ (e: 'delete', id: number): void }>()
</script>

<style scoped>
.entry-enter-active { transition: all 0.25s ease; }
.entry-leave-active { transition: all 0.2s ease; position: absolute; width: 100%; }
.entry-enter-from { opacity: 0; transform: translateY(-8px); }
.entry-leave-to { opacity: 0; transform: translateX(40px); }
</style>
