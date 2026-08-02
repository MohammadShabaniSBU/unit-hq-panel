<script setup lang="ts">
import type { ImageBlockParams } from '~/types/email-builder'

defineProps<{
  params: ImageBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="flex justify-center px-6 py-3">
    <img
      v-if="params.url"
      :src="params.url"
      :alt="params.alt"
      class="block h-auto"
      :style="{ width: `${params.width_percent}%`, maxWidth: '100%' }"
    >
    <div
      v-else
      class="flex h-32 w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
      :style="{ width: `${params.width_percent}%` }"
    >
      {{ params.alt || $t('templates.builder.imagePlaceholder') }}
    </div>
  </div>
</template>
