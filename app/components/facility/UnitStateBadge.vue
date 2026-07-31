<script setup lang="ts">
import type { UnitState } from '~/types/unit'
import { unitStateBadgeColors } from '~/composables/useUnitState'

const props = defineProps<{
  state: UnitState | null | undefined
}>()

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
</script>

<template>
  <UBadge
    :label="$t(labelKey)"
    :color="color"
    variant="subtle"
    size="sm"
  />
</template>
