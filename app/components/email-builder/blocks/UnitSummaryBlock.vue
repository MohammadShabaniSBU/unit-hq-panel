<script setup lang="ts">
defineProps<{
  params?: Record<string, never>
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-3">
    <div class="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
      <p class="font-medium">
        {{ $t('templates.builder.unitSummaryTitle') }}
      </p>
      <p class="mt-1 text-dimmed">
        {{ $t('templates.builder.unitSummaryHint') }}
      </p>
    </div>
  </div>
</template>
