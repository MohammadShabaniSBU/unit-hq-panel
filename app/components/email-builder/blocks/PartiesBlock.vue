<script setup lang="ts">
defineProps<{
  params?: Record<string, never>
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-3">
    <div class="rounded border border-dashed border-default bg-muted/40 p-4 text-sm">
      <p class="font-medium text-highlighted">
        {{ $t('templates.builder.blockParties') }}
      </p>
      <p class="mt-1 text-dimmed">
        {{ $t('templates.builder.blockPartiesDesc') }}
      </p>
    </div>
  </div>
</template>
