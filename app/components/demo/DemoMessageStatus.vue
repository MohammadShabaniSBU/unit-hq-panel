<script setup lang="ts">
const props = defineProps<{
  consultingToolKey?: string | null
  blockedBy?: string | null
}>()

const { t } = useI18n()

const consultingLabel = computed(() => {
  if (!props.consultingToolKey) {
    return null
  }

  const key = `ai.tools.${props.consultingToolKey}`
  const label = t(key)
  return label === key ? props.consultingToolKey : label
})

const blockedLabel = computed(() => {
  if (!props.blockedBy) {
    return null
  }

  const key = `ai.guards.${props.blockedBy}`
  const guard = t(key)
  return t('demo.chat.blockedDraft', {
    guard: guard === key ? props.blockedBy : guard
  })
})
</script>

<template>
  <p
    v-if="consultingLabel"
    class="mt-1 text-xs italic text-dimmed"
  >
    {{ $t('demo.chat.consulting', { tool: consultingLabel }) }}
  </p>
  <p
    v-if="blockedLabel"
    class="mt-1 text-xs text-warning"
  >
    {{ blockedLabel }}
  </p>
</template>
