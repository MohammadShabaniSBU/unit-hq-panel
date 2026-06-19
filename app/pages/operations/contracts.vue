<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiLease, LeaseStatusFilter } from '~/types/lease'
import { LEASE_STATUSES } from '~/types/lease'
import { leaseStatusColor } from '~/composables/useLeasesList'

const showForm = ref(false)

const {
  searchQuery,
  statusFilter,
  paginatedLeases,
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
} = useLeasesList()

const router = useRouter()
const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusFilterOptions = computed(() => [
  { label: t('pages.contracts.allStatuses'), value: 'all' as LeaseStatusFilter },
  ...LEASE_STATUSES.map(status => ({
    label: t(`leaseStatus.${status}`),
    value: status as LeaseStatusFilter
  }))
])

const columns = computed<TableColumn<ApiLease>[]>(() => [
  {
    id: 'contact',
    header: t('table.contact'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' },
      row.original.contact?.name ?? `#${row.original.contact_id}`)
  },
  {
    id: 'unit',
    header: t('table.unit'),
    cell: ({ row }) => {
      const unit = row.original.unit
      if (!unit) return `#${row.original.unit_id}`
      return `${unit.unit_number}${unit.site ? ` · ${unit.site.name}` : ''}`
    }
  },
  {
    accessorKey: 'actual_rate',
    header: 'Rate',
    cell: ({ row }) => `£${row.original.actual_rate}/mo`
  },
  {
    accessorKey: 'start_date',
    header: 'Start',
    cell: ({ row }) => row.original.start_date
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`leaseStatus.${row.original.status}`),
      color: leaseStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-10', td: 'w-10 text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[
        {
          label: 'View deal',
          icon: 'i-lucide-link-2',
          disabled: !row.original.deal_id,
          onSelect() {
            if (row.original.deal_id) router.push(`/marketing/deals/${row.original.deal_id}`)
          }
        },
        {
          label: 'View contact',
          icon: 'i-lucide-user',
          onSelect() {
            router.push(`/marketing/contacts/${row.original.contact_id}`)
          }
        }
      ]],
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
          {{ $t('pages.contracts.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.contracts.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.contracts.search')"
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
          :label="$t('pages.contracts.newContract')"
          color="primary"
          class="shrink-0"
          @click="showForm = true"
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
        {{ $t('pages.contracts.loadError') }}
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
          :data="paginatedLeases"
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

    <MarketingContractFormSlideover
      v-model:open="showForm"
      @saved="refresh()"
    />
  </UContainer>
</template>
