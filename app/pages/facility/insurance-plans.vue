<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  ApiInsurancePlan,
  ApiInsuranceRateMatrixCell,
  ApiInsuranceRateMatrixRow,
  ApiInsuranceRateMatrixSite,
  ApiInsuranceSiteRate
} from '~/types/facility'
import { formatInsuranceCoverage, useInsurancePlansList } from '~/composables/useInsurancePlansList'
import { formatInsuranceRateCell, useInsuranceRateMatrix } from '~/composables/useInsuranceRateMatrix'

type InsurancePlansView = 'list' | 'rates'

const formPlan = ref<ApiInsurancePlan | null>(null)
const showForm = ref(false)
const activeView = ref<InsurancePlansView>('list')
const ratesSearchQuery = ref('')
const savingByCell = reactive<Record<string, boolean>>({})
const errorByCell = reactive<Record<string, string | null>>({})
const cellOverrides = reactive<Record<string, ApiInsuranceRateMatrixCell>>({})

const {
  searchQuery,
  paginatedPlans,
  totalCount,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending: listPending,
  error: listError,
  refresh: refreshList,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useInsurancePlansList()

const {
  sites,
  filteredRows,
  pending: ratesPending,
  error: ratesError,
  refresh: refreshRates
} = useInsuranceRateMatrix(ratesSearchQuery)

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const isListView = computed(() => activeView.value === 'list')
const isLoading = computed(() => isListView.value ? listPending.value : ratesPending.value)
const loadError = computed(() => isListView.value ? listError.value : ratesError.value)

function openCreate() {
  formPlan.value = null
  showForm.value = true
}

function openEdit(plan: ApiInsurancePlan) {
  formPlan.value = plan
  showForm.value = true
}

function refreshCurrentView() {
  if (isListView.value) {
    refreshList()
    return
  }

  refreshRates()
}

function onSaved() {
  refreshList()
  refreshRates()
}

function cellKey(insuranceId: number, siteId: number) {
  return `${insuranceId}:${siteId}`
}

function resolvedCell(row: ApiInsuranceRateMatrixRow, site: ApiInsuranceRateMatrixSite) {
  const key = cellKey(row.insurance_id, site.id)
  return cellOverrides[key] ?? row.rates[String(site.id)] ?? null
}

function formattedCellRate(row: ApiInsuranceRateMatrixRow, site: ApiInsuranceRateMatrixSite) {
  return formatInsuranceRateCell(
    resolvedCell(row, site),
    t,
    t('common.emptyValue')
  )
}

async function handleSave(row: ApiInsuranceRateMatrixRow, site: ApiInsuranceRateMatrixSite, value: string | null) {
  const key = cellKey(row.insurance_id, site.id)

  if (!value) {
    errorByCell[key] = t('pages.insurancePlans.amountRequired')
    return
  }

  savingByCell[key] = true
  errorByCell[key] = null

  try {
    const response = await post<ApiInsuranceSiteRate>(`/api/insurances/${row.insurance_id}/rates`, {
      site_id: site.id,
      amount: value
    })

    if (response.data.amount && response.data.currency && response.data.billing_period) {
      cellOverrides[key] = {
        amount: response.data.amount,
        currency: response.data.currency,
        billing_period: response.data.billing_period
      }
    }

    toast.add({
      title: t('pages.insurancePlans.saveSuccessMessage'),
      color: 'success'
    })
  } catch (err: unknown) {
    const fetchError = err as {
      data?: {
        message?: string
        errors?: Record<string, Array<string>>
      }
    }

    errorByCell[key] = fetchError.data?.errors?.amount?.[0] ?? null

    toast.add({
      title: fetchError.data?.message ?? t('pages.insurancePlans.saveErrorMessage'),
      color: 'error'
    })
  } finally {
    savingByCell[key] = false
  }
}

const columns = computed<TableColumn<ApiInsurancePlan>[]>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'description',
    header: t('table.note'),
    cell: ({ row }) => row.original.description ?? t('common.emptyValue')
  },
  {
    id: 'coverage',
    header: t('table.coverage'),
    cell: ({ row }) => formatInsuranceCoverage(row.original)
  },
  {
    accessorKey: 'currency',
    header: t('table.currency'),
    cell: ({ row }) => row.original.currency
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
          {{ $t('pages.insurancePlans.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.insurancePlans.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="flex items-center rounded-lg border border-default p-0.5">
          <UButton
            icon="i-lucide-rows-3"
            :color="activeView === 'list' ? 'primary' : 'neutral'"
            :variant="activeView === 'list' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.insurancePlans.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-grid-3x3"
            :color="activeView === 'rates' ? 'primary' : 'neutral'"
            :variant="activeView === 'rates' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.insurancePlans.viewRates')"
            @click="activeView = 'rates'"
          />
        </div>

        <UInput
          v-if="isListView"
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.insurancePlans.search')"
          class="w-full sm:w-72"
        />

        <UInput
          v-else
          v-model="ratesSearchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.insurancePlans.search')"
          class="w-full sm:w-72"
        />

        <UButton
          v-if="isListView"
          icon="i-lucide-plus"
          :label="$t('pages.insurancePlans.addPlan')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="isLoading"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="loadError"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.insurancePlans.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refreshCurrentView()"
      />
    </div>

    <template v-else>
      <div
        v-if="isListView"
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 280px)"
      >
        <UTable
          :data="paginatedPlans"
          :columns="columns"
        />
      </div>

      <div
        v-else
        class="mt-6 overflow-auto rounded-lg border border-default"
        style="max-height: calc(100vh - 260px)"
      >
        <table class="min-w-full border-collapse">
          <thead class="sticky top-0 z-20 bg-default">
            <tr>
              <th class="sticky left-0 z-20 border-b border-default bg-default px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-dimmed">
                {{ $t('table.name') }}
              </th>
              <th
                v-for="site in sites"
                :key="site.id"
                class="border-b border-default px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-dimmed"
              >
                {{ site.name }}
              </th>
            </tr>
          </thead>

          <tbody v-if="filteredRows.length">
            <tr
              v-for="row in filteredRows"
              :key="row.insurance_id"
              class="border-b border-default/70 last:border-b-0"
            >
              <td class="sticky left-0 z-10 bg-default px-3 py-2 align-top">
                <p class="font-medium text-highlighted">
                  {{ row.name }}
                </p>
              </td>

              <td
                v-for="site in sites"
                :key="site.id"
                class="px-3 py-1.5 align-top"
              >
                <InlineField
                  :value="resolvedCell(row, site)?.amount ?? null"
                  :display-value="formattedCellRate(row, site)"
                  :loading="savingByCell[cellKey(row.insurance_id, site.id)]"
                  :error="errorByCell[cellKey(row.insurance_id, site.id)]"
                  type="number"
                  align="right"
                  class="ml-auto w-44"
                  :placeholder="$t('pages.insurancePlans.amountPlaceholder')"
                  @save="handleSave(row, site, $event)"
                  @cancel="errorByCell[cellKey(row.insurance_id, site.id)] = null"
                />
              </td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr>
              <td
                :colspan="sites.length + 1"
                class="px-3 py-8 text-center text-sm text-dimmed"
              >
                {{ $t('pages.insurancePlans.noResults') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <FacilityListPagination
        v-if="isListView"
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

    <FacilityInsurancePlanFormSlideover
      v-model:open="showForm"
      v-model:plan="formPlan"
      @saved="onSaved()"
    />
  </UContainer>
</template>
