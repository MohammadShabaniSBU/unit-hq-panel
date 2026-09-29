<script setup lang="ts">
/* eslint-disable vue/no-v-html -- static brand SVG; ink follows currentColor */
import rawLogo from '~/assets/images/logo.svg?raw'

const props = withDefaults(defineProps<{
  /** Crop to the K, for the collapsed navigation rail. */
  mark?: boolean
}>(), {
  mark: false
})

const { t } = useI18n()

const svg = computed(() => {
  const viewBox = props.mark ? '40 64 214 240' : '0 0 1315.67 399.2'
  const label = t('sidebar.brand')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
  const sizing = props.mark ? 'block size-full' : 'block h-full w-auto'

  return rawLogo.replace(
    /<svg\b[^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}" class="${sizing}">`
  )
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    v-html="svg"
  />
</template>
