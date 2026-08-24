<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiTaxRate } from '~/types/tax-rate'

const {
  searchQuery,
  taxRates,
  historyCode,
  pending,
  error,
  refresh,
  viewHistory,
  exitHistory
} = useTaxRateList()

const { t } = useI18n()
const toast = useToast()
const { formatDate, formatRange } = useOrgDateFormat()
const { post } = useApi()

const formTaxRate = ref<ApiTaxRate | null>(null)
const showForm = ref(false)

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  formTaxRate.value = null
  showForm.value = true
}

function openEdit(taxRate: ApiTaxRate) {
  formTaxRate.value = taxRate
  showForm.value = true
}

async function handleSetDefault(taxRate: ApiTaxRate) {
  try {
    await post<ApiTaxRate>(`/api/tax-rates/${taxRate.id}/default`, {})
    toast.add({
      title: t('pages.settings.taxRates.setDefaultSuccessMessage'),
      color: 'success'
    })
    refresh()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message ?? t('pages.settings.taxRates.setDefaultErrorMessage'),
      color: 'error'
    })
  }
}

const columns = computed<Array<TableColumn<ApiTaxRate>>>(() => [
  {
    accessorKey: 'name',
    header: t('table.name'),
    cell: ({ row }) => h('div', { class: 'flex flex-col gap-0.5' }, [
      h('span', { class: 'font-medium text-highlighted' }, row.original.name),
      h('span', { class: 'text-xs text-dimmed' }, row.original.code)
    ])
  },
  {
    id: 'rate',
    header: t('table.value'),
    cell: ({ row }) => `${row.original.rate}%`
  },
  {
    id: 'jurisdiction',
    header: t('pages.settings.taxRates.jurisdiction.label'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.jurisdiction
        ?? t('pages.settings.taxRates.jurisdiction.universal'),
      color: row.original.jurisdiction ? 'neutral' : 'primary',
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'effective',
    header: t('table.effectiveDates'),
    cell: ({ row }) => row.original.effective_to
      ? formatRange(row.original.effective_from, row.original.effective_to)
      : `${formatDate(row.original.effective_from)} → ${t('pages.settings.taxRates.ongoing')}`
  },
  {
    id: 'is_default',
    header: t('pages.settings.taxRates.default'),
    cell: ({ row }) => row.original.is_default
      ? h(UBadge, { label: t('pages.settings.taxRates.default'), color: 'primary', variant: 'subtle', size: 'sm' })
      : '—'
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
    cell: ({ row }) => historyCode.value
      ? null
      : h(UDropdownMenu, {
          items: [[
            {
              label: t('common.edit'),
              icon: 'i-lucide-pencil',
              onSelect() {
                openEdit(row.original)
              }
            },
            {
              label: t('pages.settings.taxRates.viewHistory'),
              icon: 'i-lucide-history',
              onSelect() {
                viewHistory(row.original.code)
              }
            },
            ...(row.original.is_default
              ? []
              : [{
                  label: t('pages.settings.taxRates.setDefault'),
                  icon: 'i-lucide-star',
                  onSelect() {
                    handleSetDefault(row.original)
                  }
                }])
          ]],
          content: { align: 'end' }
        }, {
          default: () => h(UButton, {
            'icon': 'i-lucide-ellipsis',
            'color': 'neutral',
            'variant': 'ghost',
            'size': 'sm',
            'square': true,
            'aria-label': t('common.actions')
          })
        })
  }
])
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="$t('pages.settings.taxRates.title')"
      :subtitle="$t('pages.settings.taxRates.subtitle')"
    />

    <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <UInput
          v-if="!historyCode"
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.settings.taxRates.search')"
          class="w-full sm:w-64"
        />
        <UButton
          v-else
          icon="i-lucide-arrow-left"
          :label="$t('pages.settings.taxRates.backToCurrent', { code: historyCode })"
          color="neutral"
          variant="outline"
          @click="exitHistory"
        />
      </div>

      <UButton
        v-if="!historyCode"
        icon="i-lucide-plus"
        :label="$t('pages.settings.taxRates.addTaxRate')"
        color="primary"
        class="shrink-0"
        @click="openCreate"
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

    <SettingsLoadError
      v-else-if="error"
      :message="$t('pages.settings.taxRates.loadError')"
      @retry="refresh()"
    />

    <div
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="taxRates"
        :columns="columns"
      />
    </div>

    <SettingsTaxRateFormSlideover
      v-model:open="showForm"
      v-model:tax-rate="formTaxRate"
      @saved="refresh()"
    />
  </div>
</template>
