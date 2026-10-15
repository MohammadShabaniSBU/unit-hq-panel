<script setup lang="ts">
import type { LogoHeaderBlockParams } from '~/types/email-builder'

defineProps<{
  params: LogoHeaderBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div
    class="px-6 py-4"
    :class="params.align === 'center' ? 'text-center' : 'text-left'"
  >
    <span
      class="inline-flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500"
      :style="{ maxWidth: `${params.max_width}px`, width: '100%' }"
    >
      {{ $t('templates.builder.blockLogoHeader') }}
    </span>
  </div>
</template>
