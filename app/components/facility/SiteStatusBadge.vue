<script setup lang="ts">
type SiteStatus = 'operational' | 'maintenance'

defineProps<{
  status: SiteStatus
}>()

const badgeStyles: Record<SiteStatus, string> = {
  operational: 'bg-success/10 text-success',
  maintenance: 'bg-warning/10 text-warning'
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
    :class="badgeStyles[status]"
  >
    {{ $t(`status.site.${status}`) }}
  </span>
</template>
