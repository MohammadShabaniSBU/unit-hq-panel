<script setup lang="ts">
import type { CalloutBlockParams } from '~/types/email-builder'

const props = defineProps<{
  params: CalloutBlockParams
  selected?: boolean
}>()

const toneClass = computed(() => {
  if (props.params.tone === 'warning') return 'border-amber-300 bg-amber-50 text-amber-950'
  if (props.params.tone === 'danger') return 'border-red-300 bg-red-50 text-red-950'
  return 'border-sky-300 bg-sky-50 text-sky-950'
})
</script>

<template>
  <div
    class="mx-4 my-3 rounded border px-3 py-2 text-sm"
    :class="toneClass"
  >
    <p
      v-if="params.title"
      class="mb-1 font-semibold"
    >
      {{ params.title }}
    </p>
    <div v-html="params.html" />
  </div>
</template>
