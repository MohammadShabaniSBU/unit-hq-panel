<script setup lang="ts">
defineProps<{
  params?: Record<string, never>
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-3">
    <div class="rounded border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
      <p class="font-medium text-highlighted">
        {{ $t('templates.builder.blockSignatureAnchor') }}
      </p>
      <p class="mt-1 font-mono text-dimmed">
        {{ '{' + '{signature}' + '}' }}
      </p>
    </div>
  </div>
</template>
