<script setup lang="ts">
import type { ApiUnitClassPriceMatrixCell, ApiUnitClassPriceMatrixRow, ApiUnitClassPriceMatrixSite, ApiUnitClassSitePrice } from '~/types/facility'
import { formatUnitClassPriceCell } from '~/composables/useUnitClassPriceMatrix'

const { t } = useI18n()
const toast = useToast()
const { post } = useApi()

const searchQuery = ref('')
const savingByCell = reactive<Record<string, boolean>>({})
const errorByCell = reactive<Record<string, string | null>>({})
const cellOverrides = reactive<Record<string, ApiUnitClassPriceMatrixCell>>({})

const {
  sites,
  filteredRows,
  pending,
  error,
  refresh
} = useUnitClassPriceMatrix(searchQuery)

function cellKey(unitClassId: number, siteId: number) {
  return `${unitClassId}:${siteId}`
}

function resolvedCell(row: ApiUnitClassPriceMatrixRow, site: ApiUnitClassPriceMatrixSite) {
  const key = cellKey(row.unit_class_id, site.id)
  return cellOverrides[key] ?? row.prices[String(site.id)] ?? null
}

function formattedCellPrice(row: ApiUnitClassPriceMatrixRow, site: ApiUnitClassPriceMatrixSite) {
  return formatUnitClassPriceCell(
    resolvedCell(row, site),
    t,
    t('common.emptyValue')
  )
}

async function handleSave(row: ApiUnitClassPriceMatrixRow, site: ApiUnitClassPriceMatrixSite, value: string | null) {
  const key = cellKey(row.unit_class_id, site.id)

  if (!value) {
    errorByCell[key] = t('pages.rates.amountRequired')
    return
  }

  savingByCell[key] = true
  errorByCell[key] = null

  try {
    const response = await post<ApiUnitClassSitePrice>(`/api/unit-classes/${row.unit_class_id}/prices`, {
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
      title: t('pages.rates.saveSuccessMessage'),
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
      title: fetchError.data?.message ?? t('pages.rates.saveErrorMessage'),
      color: 'error'
    })
  } finally {
    savingByCell[key] = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.rates.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.rates.subtitle') }}
        </p>
      </div>

      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="$t('pages.rates.search')"
        class="w-full lg:w-80"
      />
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
        {{ $t('pages.rates.loadError') }}
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

    <div
      v-else
      class="mt-6 overflow-auto rounded-lg border border-default"
      style="max-height: calc(100vh - 260px)"
    >
      <table class="min-w-full border-collapse">
        <thead class="sticky top-0 z-20 bg-default">
          <tr>
            <th class="sticky left-0 z-20 border-b border-default bg-default px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-dimmed">
              {{ $t('table.code') }}
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
            :key="row.unit_class_id"
            class="border-b border-default/70 last:border-b-0"
          >
            <td class="sticky left-0 z-10 bg-default px-3 py-2 align-top">
              <p class="font-medium text-highlighted">
                {{ row.code }}
              </p>
              <p class="text-xs text-dimmed">
                {{ row.label }}
              </p>
            </td>

            <td
              v-for="site in sites"
              :key="site.id"
              class="px-3 py-1.5 align-top"
            >
              <InlineField
                :value="resolvedCell(row, site)?.amount ?? null"
                :display-value="formattedCellPrice(row, site)"
                :loading="savingByCell[cellKey(row.unit_class_id, site.id)]"
                :error="errorByCell[cellKey(row.unit_class_id, site.id)]"
                type="number"
                align="right"
                class="ml-auto w-44"
                :placeholder="$t('pages.rates.amountPlaceholder')"
                @save="handleSave(row, site, $event)"
                @cancel="errorByCell[cellKey(row.unit_class_id, site.id)] = null"
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
              {{ $t('pages.rates.noResults') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UContainer>
</template>
