<script setup lang="ts">
import type { RawHtmlBlockParams } from '~/types/email-builder'

defineProps<{
  params: RawHtmlBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="px-2 py-2">
    <div class="mb-2 rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
      {{ $t('templates.builder.rawHtmlWarning') }}
    </div>
    <div
      class="overflow-hidden"
      v-html="params.html"
    />
  </div>
</template>
