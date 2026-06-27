<script setup lang="ts">
import type { ButtonBlockProps } from '~/types/email-builder'

defineProps<{
  props: ButtonBlockProps
  selected?: boolean
}>()
</script>

<template>
  <div
    class="w-full px-4 py-3"
    :style="{ textAlign: props.align }"
  >
    <a
      :href="props.href"
      class="inline-block cursor-default rounded-lg px-6 py-3 text-sm font-semibold no-underline"
      :style="{
        backgroundColor: props.backgroundColor,
        color: props.textColor
      }"
      @click.prevent
    >
      {{ props.label }}
    </a>
  </div>
</template>
