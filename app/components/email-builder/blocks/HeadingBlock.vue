<script setup lang="ts">
import type { HeadingBlockProps } from '~/types/email-builder'

defineProps<{
  props: HeadingBlockProps
  selected?: boolean
}>()

const fontSizeMap: Record<1 | 2 | 3, string> = {
  1: '2rem',
  2: '1.5rem',
  3: '1.25rem',
}

const fontWeightMap: Record<1 | 2 | 3, string> = {
  1: '700',
  2: '600',
  3: '600',
}
</script>

<template>
  <div
    class="w-full px-4 py-3"
    :style="{ textAlign: props.align }"
  >
    <component
      :is="`h${props.level}`"
      :style="{
        fontSize: fontSizeMap[props.level],
        fontWeight: fontWeightMap[props.level],
        color: props.color,
        lineHeight: '1.3',
        margin: 0,
      }"
    >
      {{ props.content }}
    </component>
  </div>
</template>
