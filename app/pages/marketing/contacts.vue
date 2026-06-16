<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ContactStatusFilter } from '~/types/contact'

const {
  searchQuery,
  statusFilter,
  sortOrder,
  tabCounts,
  paginatedContacts,
  totalCount,
  showingCount,
  selectedIds,
  isAllPageSelected,
  isSomePageSelected,
  canGoPrev,
  canGoNext,
  setStatusFilter,
  setSortOrder,
  goToPrevPage,
  goToNextPage,
  toggleSelected,
  toggleAllSelected
} = useContactsList()

const statusTabs: Array<{ key: ContactStatusFilter, label: string, count: number, countClass?: string }> = [
  { key: 'all', label: 'All', count: tabCounts.all },
  { key: 'lead', label: 'Leads', count: tabCounts.lead },
  { key: 'reserved', label: 'Reserved', count: tabCounts.reserved },
  { key: 'active', label: 'Active', count: tabCounts.active },
  { key: 'overdue', label: 'Overdue', count: tabCounts.overdue, countClass: 'text-error' }
]

const sortItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: 'Newest first',
    type: 'checkbox',
    checked: sortOrder.value === 'newest',
    onUpdateChecked(checked: boolean) {
      if (checked) {
        setSortOrder('newest')
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  },
  {
    label: 'Oldest first',
    type: 'checkbox',
    checked: sortOrder.value === 'oldest',
    onUpdateChecked(checked: boolean) {
      if (checked) {
        setSortOrder('oldest')
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }
]])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Contacts
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          Leads, tenants and business accounts across all sites.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search name, phone, email..."
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          label="New contact"
          color="primary"
          class="shrink-0"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap items-center gap-1">
        <UButton
          v-for="tab in statusTabs"
          :key="tab.key"
          color="neutral"
          :variant="statusFilter === tab.key ? 'solid' : 'ghost'"
          size="sm"
          class="rounded-full"
          @click="setStatusFilter(tab.key)"
        >
          {{ tab.label }}
          <span
            class="ms-1 tabular-nums"
            :class="tab.countClass"
          >
            {{ tab.count.toLocaleString() }}
          </span>
        </UButton>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-sliders-horizontal"
          label="Filters"
          color="neutral"
          variant="outline"
          size="sm"
        />

        <UDropdownMenu
          :items="sortItems"
          :content="{ align: 'end' }"
        >
          <UButton
            label="Last activity"
            trailing-icon="i-lucide-chevron-down"
            color="neutral"
            variant="outline"
            size="sm"
          />
        </UDropdownMenu>
      </div>
    </div>

    <div class="mt-4">
      <ContactsTable
        :contacts="paginatedContacts"
        :selected-ids="selectedIds"
        :is-all-page-selected="isAllPageSelected"
        :is-some-page-selected="isSomePageSelected"
        @toggle-selected="toggleSelected"
        @toggle-all-selected="toggleAllSelected"
      />
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
