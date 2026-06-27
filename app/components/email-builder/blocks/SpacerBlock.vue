<script setup lang="ts">
import type { SpacerBlockProps } from '~/types/email-builder'

defineProps<{
  props: SpacerBlockProps
  selected?: boolean
}>()
</script>

<template>
  <div
    class="w-full"
    :style="{ height: `${props.height}px` }"
  />
</template>
