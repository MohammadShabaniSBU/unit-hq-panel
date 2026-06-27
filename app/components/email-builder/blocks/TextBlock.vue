<script setup lang="ts">
import type { TextBlockProps } from '~/types/email-builder'

defineProps<{
  props: TextBlockProps
  selected?: boolean
}>()
</script>

<template>
  <div
    class="w-full px-4 py-3"
    :style="{ textAlign: props.align }"
  >
    <p
      :style="{
        fontSize: `${props.fontSize}px`,
        color: props.color,
        lineHeight: '1.6',
        margin: 0
      }"
      v-html="props.content"
    />
  </div>
</template>
