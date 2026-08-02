<script setup lang="ts">
import type { ButtonBlockParams } from '~/types/email-builder'

defineProps<{
  params: ButtonBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="flex justify-center px-6 py-4">
    <span
      class="inline-block rounded px-7 py-3 text-base font-bold"
      :class="params.style === 'outline'
        ? 'border-2 border-blue-700 bg-white text-blue-700'
        : 'bg-blue-700 text-white'"
    >
      {{ params.label }}
    </span>
  </div>
</template>
