<script setup lang="ts">
defineProps<{
  params?: Record<string, never>
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-2">
    <div class="flex items-center gap-2 text-xs uppercase tracking-wide text-dimmed">
      <div class="h-px flex-1 border-t border-dashed border-default" />
      <span>{{ $t('templates.builder.blockPageBreak') }}</span>
      <div class="h-px flex-1 border-t border-dashed border-default" />
    </div>
  </div>
</template>
