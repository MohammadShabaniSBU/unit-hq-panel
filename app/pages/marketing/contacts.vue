<script setup lang="ts">
import type { ContactStatusFilter } from '~/types/contact'
import { CONTACT_LIFECYCLE_STATUSES } from '~/types/contact'

const { t } = useI18n()

const showForm = ref(false)

function openCreate() {
  showForm.value = true
}

const {
  searchQuery,
  statusFilter,
  tabCounts,
  paginatedContacts,
  totalCount,
  showingCount,
  selectedIds,
  isAllPageSelected,
  isSomePageSelected,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  setStatusFilter,
  goToPrevPage,
  goToNextPage,
  goToPage,
  toggleSelected,
  toggleAllSelected
} = useContactsList()

const TAB_LABELS: Record<ContactStatusFilter, string> = {
  all: 'pages.contacts.all',
  prospect: 'pages.contacts.prospect',
  lead: 'pages.contacts.lead',
  opportunity: 'pages.contacts.opportunity',
  tenant: 'pages.contacts.tenant',
  past_tenant: 'pages.contacts.pastTenant',
  lost: 'pages.contacts.lost'
}

const statusTabs = computed<Array<{ key: ContactStatusFilter, label: string, count: number }>>(() => {
  const filters: Array<ContactStatusFilter> = ['all', ...CONTACT_LIFECYCLE_STATUSES]

  return filters.map(key => ({
    key,
    label: t(TAB_LABELS[key]),
    count: tabCounts.value[key]
  }))
})
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.contacts.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.contacts.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.contacts.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.contacts.newContact')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-1">
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
        <span class="ms-1 tabular-nums">
          {{ tab.count.toLocaleString() }}
        </span>
      </UButton>
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
        {{ $t('pages.contacts.loadError') }}
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

      <FacilityListPagination
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <ContactFormSlideover
      v-model:open="showForm"
      @saved="refresh()"
    />
  </UContainer>
</template>
