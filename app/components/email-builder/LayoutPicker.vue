<script setup lang="ts">
import type { EmailLayout } from '~/types/email-builder'

withDefaults(defineProps<{
  locked?: boolean
}>(), {
  locked: false
})

const emit = defineEmits<{
  select: [layout: EmailLayout]
}>()

const layouts: Array<EmailLayout> = ['100', '50_50', '33_67', '67_33', '33_33_33']

const widths: Record<EmailLayout, Array<string>> = {
  '100': ['100%'],
  '50_50': ['50%', '50%'],
  '33_67': ['33%', '67%'],
  '67_33': ['67%', '33%'],
  '33_33_33': ['33.33%', '33.33%', '33.34%']
}

const labels: Record<EmailLayout, string> = {
  '100': 'templates.builder.layout100',
  '50_50': 'templates.builder.layout5050',
  '33_67': 'templates.builder.layout3367',
  '67_33': 'templates.builder.layout6733',
  '33_33_33': 'templates.builder.layout333333'
}
</script>

<template>
  <div class="grid grid-cols-1 gap-1 p-1">
    <button
      v-for="layout in layouts"
      :key="layout"
      type="button"
      class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="locked && layout !== '100'"
      @click="emit('select', layout)"
    >
      <span class="flex h-5 w-16 shrink-0 gap-0.5">
        <span
          v-for="(width, index) in widths[layout]"
          :key="`${layout}-${index}`"
          class="h-full rounded-sm bg-primary/70"
          :style="{ width }"
        />
      </span>
      <span class="text-xs text-highlighted">
        {{ $t(labels[layout]) }}
      </span>
    </button>
  </div>
</template>
