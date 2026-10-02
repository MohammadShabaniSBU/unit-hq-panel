<script setup lang="ts">
/* eslint-disable vue/no-v-html -- static Kolbe mark */
import rawMark from '~/assets/images/kolbe.svg?raw'

const props = withDefaults(defineProps<{
  /** Heavier strokes, for the new-chat mark. */
  bold?: boolean
}>(), {
  bold: false
})

const svg = computed(() => {
  const painted = props.bold
    ? rawMark.replaceAll('stroke:none', 'stroke:#3d3660;stroke-width:18;stroke-linejoin:round;stroke-linecap:round')
    : rawMark

  return painted.replace(
    /<svg\b[^>]*>/,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 793.70135 793.70667" aria-hidden="true" class="block size-full">'
  )
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    v-html="svg"
  />
</template>
