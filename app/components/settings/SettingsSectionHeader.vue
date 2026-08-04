<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <header class="mb-6 border-b border-default pb-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-lg font-semibold tracking-tight text-highlighted">
          {{ title }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ subtitle }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="shrink-0"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
