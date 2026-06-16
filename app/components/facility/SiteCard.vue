<script setup lang="ts">
import type { Site } from '~/types/facility'
import {
  formatOccupancyPercent,
  formatSiteRevenue,
  occupancyBarColor
} from '~/composables/useSitesList'

defineProps<{
  site: Site
}>()
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-default bg-default shadow-sm">
    <div
      class="h-1"
      :class="occupancyBarColor(site.occupancyPercent)"
    />

    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-semibold text-highlighted">
            {{ site.name }}
          </h3>
          <p class="mt-0.5 truncate text-sm text-dimmed">
            {{ site.address }}
          </p>
        </div>
        <FacilitySiteStatusBadge :status="site.status" />
      </div>

      <div class="mt-5">
        <div class="flex items-center justify-between text-sm">
          <span class="text-dimmed">Occupancy</span>
          <span class="font-medium tabular-nums text-highlighted">
            {{ formatOccupancyPercent(site.occupancyPercent) }}
          </span>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
          <div
            class="h-full rounded-full transition-all"
            :class="occupancyBarColor(site.occupancyPercent)"
            :style="{ width: `${site.occupancyPercent}%` }"
          />
        </div>
      </div>

      <div class="mt-5 grid grid-cols-3 gap-4 border-t border-default pt-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            Units
          </p>
          <p class="mt-1 text-lg font-semibold tabular-nums text-highlighted">
            {{ site.totalUnits }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            Vacant
          </p>
          <p class="mt-1 text-lg font-semibold tabular-nums text-highlighted">
            {{ site.vacantUnits }}
          </p>
        </div>
        <div>
          <p class="text-xs uppercase tracking-wide text-dimmed">
            Revenue
          </p>
          <p class="mt-1 text-lg font-semibold tabular-nums text-highlighted">
            {{ formatSiteRevenue(site.revenue, true) }}
          </p>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-between gap-3 border-t border-default pt-4">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="integration in site.integrations"
            :key="integration"
            class="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-xs text-muted"
          >
            <span class="size-1.5 rounded-full bg-success" />
            {{ integration }}
          </span>
        </div>
        <UButton
          label="Manage"
          trailing-icon="i-lucide-chevron-right"
          color="neutral"
          variant="link"
          size="sm"
          class="shrink-0"
        />
      </div>
    </div>
  </div>
</template>
