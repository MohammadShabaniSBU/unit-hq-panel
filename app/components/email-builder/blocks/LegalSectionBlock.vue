<script setup lang="ts">
import type { LegalSectionBlockParams } from '~/types/email-builder'

defineProps<{
  params?: LegalSectionBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="px-6 py-3">
    <p class="text-sm font-semibold text-highlighted">
      {{ params?.heading || $t('templates.builder.blockLegalSection') }}
    </p>
    <p class="mt-1 whitespace-pre-wrap text-sm text-dimmed">
      {{ params?.body || $t('templates.builder.blockLegalSectionDesc') }}
    </p>
  </div>
</template>
