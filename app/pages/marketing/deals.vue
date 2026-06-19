<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiDeal } from '~/types/deal'
import { DEAL_STATUSES } from '~/types/deal'
import {
  dealStatusColor,
  formatDealStay
} from '~/composables/useDealsList'

const showForm = ref(false)

const {
  searchQuery,
  statusFilter,
  paginatedDeals,
  totalCount,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useDealsList()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  showForm.value = true
}

function openEdit(_deal: ApiDeal) {
  // Edit flow to be implemented later.
}

const statusFilterOptions = computed(() => [
  { label: t('pages.deals.allStatuses'), value: 'all' },
  ...DEAL_STATUSES.map(status => ({
    label: t(`dealStatus.${status}`),
    value: status
  }))
])

const columns = computed<TableColumn<ApiDeal>[]>(() => [
  {
    id: 'contact',
    header: t('table.contact'),
    cell: ({ row }) => h(
      'span',
      { class: 'font-medium text-highlighted' },
      row.original.contact?.name ?? `#${row.original.contact_id}`
    )
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`dealStatus.${row.original.status}`),
      color: dealStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'expected_move_in',
    header: t('table.expectedMoveIn'),
    cell: ({ row }) => row.original.expected_move_in ?? t('common.emptyValue')
  },
  {
    id: 'stay',
    header: t('table.stay'),
    cell: ({ row }) => formatDealStay(row.original, t('common.emptyValue'))
  },
  {
    id: 'desired_unit_class',
    header: t('table.class'),
    cell: ({ row }) => row.original.desired_unit_class?.label ?? t('common.emptyValue')
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[{
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() {
          openEdit(row.original)
        }
      }]],
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        icon: 'i-lucide-ellipsis',
        color: 'neutral',
        variant: 'ghost',
        size: 'sm',
        square: true,
        'aria-label': t('common.actions')
      })
    })
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.deals.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.deals.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.deals.search')"
          class="w-full sm:w-72"
        />
        <USelect
          v-model="statusFilter"
          :items="statusFilterOptions"
          value-key="value"
          label-key="label"
          class="w-full sm:w-48"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.deals.newDeal')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
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
        {{ $t('pages.deals.loadError') }}
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
      <div
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 260px)"
      >
        <UTable
          :data="paginatedDeals"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
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

    <MarketingDealFormSlideover
      v-model:open="showForm"
      @saved="refresh()"
    />
  </UContainer>
</template>
