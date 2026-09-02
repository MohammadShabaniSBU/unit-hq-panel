<script setup lang="ts">
import type { VerificationLevel } from '~/types/agents'

const props = defineProps<{
  level?: VerificationLevel | string | null
}>()

const verificationKey = computed(() => {
  const level = props.level
  if (level === 'anonymous' || level === 'channel_asserted' || level === 'verified') {
    return level
  }
  return null
})
</script>

<template>
  <UTooltip
    v-if="verificationKey"
    :text="$t(`ai.verification.explain.${verificationKey}`)"
  >
    <UBadge
      :color="verificationKey === 'verified' ? 'success' : 'neutral'"
      variant="subtle"
      size="xs"
      :label="$t(`ai.verification.levels.${verificationKey}`)"
    />
  </UTooltip>
</template>
