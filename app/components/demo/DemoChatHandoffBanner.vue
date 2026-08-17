<script setup lang="ts">
defineProps<{
  reason: string
  triggerSource: string
}>()

const { t } = useI18n()

function translate(prefix: string, key: string): string {
  const path = `${prefix}.${key}`
  const label = t(path)
  return label === path ? key : label
}
</script>

<template>
  <div class="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-highlighted">
    {{ $t('demo.chat.handoffBanner', {
      reason: translate('ai.handoff_reasons', reason),
      trigger: translate('ai.handoff_triggers', triggerSource)
    }) }}
  </div>
</template>
