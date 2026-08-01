<script setup lang="ts">
import type { ApiUnitOverlock, UnitState } from '~/types/unit'
import { unitStateBadgeColors } from '~/composables/useUnitState'

const props = defineProps<{
  state: UnitState | null | undefined
  overlock?: ApiUnitOverlock | null
}>()

const { t } = useI18n()

const color = computed(() => {
  if (!props.state) {
    return 'neutral' as const
  }

  return unitStateBadgeColors[props.state]
})

const labelKey = computed(() => {
  if (!props.state) {
    return 'common.emptyValue'
  }

  return `units.state.${props.state}`
})

const overlockActive = computed(() => props.overlock?.active === true)

const tooltipText = computed(() => {
  if (!overlockActive.value) {
    return ''
  }

  const id = props.overlock?.delinquency_id
  if (id != null) {
    return t('units.overlock.tooltipWithCase', { id })
  }

  return t('units.overlock.tooltip')
})
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <UBadge
      :label="$t(labelKey)"
      :color="color"
      variant="subtle"
      size="sm"
    />
    <UTooltip
      v-if="overlockActive"
      :text="tooltipText"
    >
      <span
        class="inline-flex size-5 items-center justify-center rounded-full bg-error/10 text-error"
        :aria-label="$t('units.overlock.label')"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-3"
        />
      </span>
    </UTooltip>
  </span>
</template>
