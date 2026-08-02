<script setup lang="ts">
import type { ParagraphBlockParams } from '~/types/email-builder'

defineProps<{
  params: ParagraphBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div
    class="px-6 py-2 text-[16px] leading-relaxed text-gray-700"
    v-html="params.html"
  />
</template>
