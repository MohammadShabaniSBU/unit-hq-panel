<script setup lang="ts">
const props = defineProps<{
  automationId: string | number
  active: 'editor' | 'runs'
}>()

const { t } = useI18n()

const tabs = computed(() => [
  {
    key: 'editor' as const,
    label: t('automations.editor.tabEditor'),
    to: `/marketing/automations/${props.automationId}`
  },
  {
    key: 'runs' as const,
    label: t('automations.editor.tabRuns'),
    to: `/marketing/automations/${props.automationId}/runs`
  }
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <UButton
      v-for="tab in tabs"
      :key="tab.key"
      color="neutral"
      :variant="active === tab.key ? 'solid' : 'ghost'"
      size="sm"
      class="rounded-full"
      :label="tab.label"
      @click="navigateTo(tab.to)"
    />
  </div>
</template>
