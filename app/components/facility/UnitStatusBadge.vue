<script setup lang="ts">
type UnitStatus = 'occupied' | 'vacant' | 'reserved' | 'maintenance'

defineProps<{
  status: UnitStatus
}>()

const unitStatusDotColors: Record<UnitStatus, string> = {
  occupied: 'bg-success',
  vacant: 'bg-neutral-400',
  reserved: 'bg-warning',
  maintenance: 'bg-error'
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm">
    <span
      class="size-1.5 shrink-0 rounded-full"
      :class="unitStatusDotColors[status]"
    />
    {{ $t(`status.unit.${status}`) }}
  </span>
</template>
