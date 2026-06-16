<script setup lang="ts">
const {
  searchQuery,
  paginatedUnits,
  totalCount,
  showingCount,
  perPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage
} = useUnitsList()
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ $t('pages.units.title') }}
          </h1>
        </div>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.units.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.units.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.units.addUnit')"
          color="primary"
          class="shrink-0"
        />
      </div>
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.units.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <template v-else>
      <div class="mt-6">
        <FacilityUnitsTable :units="paginatedUnits" />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
      />
    </template>
  </UContainer>
</template>
