<script setup lang="ts">
import type { ListBlockParams } from '~/types/email-builder'

defineProps<{
  params: ListBlockParams
  selected?: boolean
}>()
</script>

<template>
  <component
    :is="params.style === 'numbered' ? 'ol' : 'ul'"
    class="m-0 px-8 py-3 text-sm text-gray-800"
    :class="params.style === 'numbered' ? 'list-decimal' : 'list-disc'"
  >
    <li
      v-for="(item, index) in params.items"
      :key="index"
      class="py-0.5"
    >
      {{ item }}
    </li>
  </component>
</template>
