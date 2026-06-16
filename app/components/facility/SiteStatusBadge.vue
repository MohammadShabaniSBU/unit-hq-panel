<script setup lang="ts">
import type { SiteStatus } from '~/types/facility'
import { siteStatusLabels } from '~/composables/useSitesList'

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
    {{ siteStatusLabels[status] }}
  </span>
</template>
