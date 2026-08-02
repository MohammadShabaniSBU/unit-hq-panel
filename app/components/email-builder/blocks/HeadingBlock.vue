<script setup lang="ts">
import type { HeadingBlockParams } from '~/types/email-builder'

const props = defineProps<{
  params: HeadingBlockParams
  selected?: boolean
}>()

const tag = computed(() => (props.params.level === 2 ? 'h2' : 'h1'))
const sizeClass = computed(() => (props.params.level === 2 ? 'text-[22px]' : 'text-[28px]'))
</script>

<template>
  <component
    :is="tag"
    class="m-0 px-6 py-3 font-bold leading-snug text-gray-900"
    :class="sizeClass"
  >
    {{ params.text }}
  </component>
</template>
