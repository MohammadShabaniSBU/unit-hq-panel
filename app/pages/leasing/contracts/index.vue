<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiContract, ContractStatusFilter } from '~/types/contract'
import { CONTRACT_STATUSES } from '~/types/contract'
import { contractStatusColor } from '~/composables/useContractsList'

const showForm = ref(false)

const {
  searchQuery,
  statusFilter,
  paginatedContracts,
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
} = useContractsList()

const router = useRouter()
const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusFilterOptions = computed(() => [
  { label: t('pages.contracts.allStatuses'), value: 'all' as ContractStatusFilter },
  ...CONTRACT_STATUSES.map(status => ({
    label: t(`contractStatus.${status}`),
    value: status as ContractStatusFilter
  }))
])

const columns = computed<TableColumn<ApiContract>[]>(() => [
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
      const unitItem = row.original.items?.find(i => i.item_type === 'unit')
      const unit = unitItem?.item as { unit_number?: string; site?: { name?: string } } | null | undefined
      if (!unit) return unitItem ? `#${unitItem.item_id}` : '—'
      return `${unit.unit_number ?? ''}${unit.site?.name ? ` · ${unit.site.name}` : ''}`
    }
  },
  {
    id: 'rate',
    header: 'Rate',
    cell: ({ row }) => {
      const unitItem = row.original.items?.find(i => i.item_type === 'unit')
      return unitItem ? `£${unitItem.rate}/mo` : '—'
    }
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
      label: t(`contractStatus.${row.original.status}`),
      color: contractStatusColor(row.original.status),
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
          label: t('pages.contracts.viewContract'),
          icon: 'i-lucide-file-text',
          onSelect() {
            router.push(`/leasing/contracts/${row.original.id}`)
          }
        },
        {
          label: t('pages.contracts.detail.viewDeal'),
          icon: 'i-lucide-link-2',
          disabled: !row.original.deal_id,
          onSelect() {
            if (row.original.deal_id) router.push(`/leasing/deals/${row.original.deal_id}`)
          }
        },
        {
          label: t('pages.contracts.detail.viewContact'),
          icon: 'i-lucide-user',
          onSelect() {
            router.push(`/leasing/contacts/${row.original.contact_id}`)
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

function onRowSelect(_event: Event, row: TableRow<ApiContract>) {
  if (!row.original.id) return
  router.push(`/leasing/contracts/${row.original.id}`)
}
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
          :data="paginatedContracts"
          :columns="columns"
          class="cursor-pointer"
          @select="onRowSelect"
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

    <LeasingContractFormSlideover
      v-model:open="showForm"
      @saved="refresh()"
    />
  </UContainer>
</template>
