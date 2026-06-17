<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <header class="mb-6 border-b border-default pb-5">
    <h1 class="text-lg font-semibold tracking-tight text-highlighted">
      {{ title }}
    </h1>
    <p class="mt-1 text-sm text-dimmed">
      {{ subtitle }}
    </p>
  </header>
</template>
