<script setup lang="ts">
const {
  searchQuery,
  paginatedUnitClasses,
  totalCount,
  showingCount,
  canGoPrev,
  canGoNext,
  goToPrevPage,
  goToNextPage
} = useUnitClassesList()
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            Unit class
          </h1>
          <UBadge
            :label="totalCount.toString()"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <p class="mt-1 text-sm text-dimmed">
          Camden Lock · Define classes, pricing and features per site
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search class, feature..."
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          label="New class"
          color="primary"
          class="shrink-0"
        />
      </div>
    </div>

    <div class="mt-6">
      <FacilityUnitClassesTable :unit-classes="paginatedUnitClasses" />
    </div>

    <div class="mt-4 flex items-center justify-between">
      <p class="text-sm text-dimmed">
        Showing {{ showingCount }} of {{ totalCount.toLocaleString() }}
      </p>

      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!canGoPrev"
          aria-label="Previous page"
          @click="goToPrevPage"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!canGoNext"
          aria-label="Next page"
          @click="goToNextPage"
        />
      </div>
    </div>
  </UContainer>
</template>
