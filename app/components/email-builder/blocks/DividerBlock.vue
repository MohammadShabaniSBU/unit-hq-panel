<script setup lang="ts">
import type { DividerBlockProps } from '~/types/email-builder'

defineProps<{
  props: DividerBlockProps
  selected?: boolean
}>()
</script>

<template>
  <div class="w-full px-4 py-3">
    <hr
      :style="{
        borderColor: props.color,
        borderTopWidth: `${props.thickness}px`,
        borderTopStyle: 'solid',
        margin: 0
      }"
    >
  </div>
</template>
