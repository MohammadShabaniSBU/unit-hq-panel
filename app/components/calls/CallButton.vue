<script setup lang="ts">
import type { CallContextType, CallDisabledReason } from '~/types/communications'

const props = withDefaults(defineProps<{
  contactId: number
  toNumber?: string | null
  contextType?: CallContextType | null
  contextId?: number | null
  label?: string | null
  iconOnly?: boolean
  size?: 'xs' | 'sm' | 'md'
  color?: 'primary' | 'neutral'
  variant?: 'solid' | 'soft' | 'outline' | 'ghost'
}>(), {
  toNumber: null,
  contextType: null,
  contextId: null,
  label: null,
  iconOnly: false,
  size: 'xs',
  color: 'neutral',
  variant: 'soft'
})

const { t } = useI18n()
const { canDial, disabledReason, ensureLoaded, pending: availabilityPending } = useCallAvailability()
const { dial, submitting } = useDial()

onMounted(() => {
  void ensureLoaded()
})

const reasonKey = computed(() => {
  const reason: CallDisabledReason | null = disabledReason.value
  if (!reason) {
    return null
  }
  const map: Record<CallDisabledReason, string> = {
    not_mapped: 'calls.disabled.notMapped',
    account_unavailable: 'calls.disabled.accountUnavailable',
    user_offline: 'calls.disabled.userOffline',
    user_busy: 'calls.disabled.userBusy'
  }
  return map[reason]
})

const tooltip = computed(() => {
  if (canDial.value) {
    return props.label ?? t('calls.call')
  }
  return reasonKey.value ? t(reasonKey.value) : t('calls.disabled.unknown')
})

const buttonLabel = computed(() => {
  if (props.iconOnly) {
    return undefined
  }
  return props.label ?? t('calls.call')
})

async function onClick() {
  if (!canDial.value || submitting.value) {
    return
  }

  await dial({
    contact_id: props.contactId,
    to_number: props.toNumber,
    context: props.contextType
      ? { type: props.contextType, id: props.contextId }
      : null
  })
}
</script>

<template>
  <UTooltip :text="tooltip">
    <UButton
      :label="buttonLabel"
      icon="i-lucide-phone"
      :color="color"
      :variant="variant"
      :size="size"
      :square="iconOnly"
      :disabled="!canDial || availabilityPending"
      :loading="submitting"
      :aria-label="tooltip"
      @click="onClick"
    />
  </UTooltip>
</template>
