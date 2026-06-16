<script setup lang="ts">
import type { UnitStatus } from '~/types/facility'
import { unitStatusDotColors, unitStatusLabels } from '~/composables/useUnitsList'

defineProps<{
  status: UnitStatus
}>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm">
    <span
      class="size-1.5 shrink-0 rounded-full"
      :class="unitStatusDotColors[status]"
    />
    {{ unitStatusLabels[status] }}
  </span>
</template>
