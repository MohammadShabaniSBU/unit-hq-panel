<script setup lang="ts">
import { formatSiteRevenue } from '~/composables/useSitesList'

const { sites, summary } = useSitesList()
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            Sites
          </h1>
          <UBadge
            :label="summary.totalSites.toString()"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <p class="mt-1 text-sm text-dimmed">
          Manage your storage locations and their settings.
        </p>
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Add site"
        color="primary"
        class="shrink-0"
      />
    </div>

    <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          Total sites
        </p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
          {{ summary.totalSites }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          Total units
        </p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
          {{ summary.totalUnits.toLocaleString() }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          Occupied
        </p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
          {{ summary.occupiedUnits.toLocaleString() }}
        </p>
      </div>
      <div class="rounded-lg border border-default bg-default p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          Total revenue/mo
        </p>
        <p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatSiteRevenue(summary.totalRevenue) }}
        </p>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-2">
      <FacilitySiteCard
        v-for="site in sites"
        :key="site.id"
        :site="site"
      />
    </div>
  </UContainer>
</template>
