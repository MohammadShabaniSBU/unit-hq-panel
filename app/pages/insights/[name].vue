<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import { REPORT_CATALOG, useReport } from '~/composables/useReport'
import type { ReportColumn, ReportFilters } from '~/types/report'

const route = useRoute()
const { t, locale } = useI18n()
const name = computed(() => String(route.params.name))

const catalogEntry = computed(() =>
  REPORT_CATALOG.find(r => r.name === name.value) ?? null
)

const { result, pending, error, downloading, fetchReport, downloadCsv } = useReport(name)

const { items: siteItems } = useOptions('/api/sites/options')

const siteId = ref<number | null>(null)
const asOf = ref<string | undefined>(undefined)
const from = ref<string | undefined>(undefined)
const to = ref<string | undefined>(undefined)

const siteOptions = computed(() => [
  { label: t('pages.insights.filters.allSites'), value: null as number | null },
  ...siteItems.value.map(s => ({ label: s.label, value: Number(s.value) }))
])

function currentFilters(): ReportFilters {
  const filters: ReportFilters = {}
  if (siteId.value != null) {
    filters.site_ids = [siteId.value]
  }
  if (asOf.value) {
    filters.as_of = asOf.value
  }
  if (from.value) {
    filters.from = from.value
  }
  if (to.value) {
    filters.to = to.value
  }
  return filters
}

async function load() {
  if (!catalogEntry.value) {
    return
  }
  await fetchReport(currentFilters())
}

watch(name, () => {
  void load()
}, { immediate: true })

function formatCell(column: ReportColumn, value: string | number | null): string {
  if (value == null || value === '') {
    return t('common.emptyValue')
  }

  if (column.type === 'money') {
    return formatMoney(value, column.currency, locale.value)
  }

  if (column.type === 'percent') {
    return `${value}%`
  }

  return String(value)
}

const columns = computed<Array<TableColumn<Record<string, string | number | null>>>>(() => {
  if (!result.value) {
    return []
  }

  return result.value.columns.map(column => ({
    id: column.key,
    accessorKey: column.key,
    header: column.label,
    cell: ({ row }) => h('span', {
      class: column.type === 'money' || column.type === 'int' || column.type === 'percent'
        ? 'tabular-nums'
        : undefined
    }, formatCell(column, row.original[column.key] ?? null))
  }))
})

function printReport() {
  if (!import.meta.client) {
    return
  }
  window.print()
}

function onApply() {
  void load()
}

async function onCsv() {
  await downloadCsv(currentFilters())
}
</script>

<template>
  <UContainer class="report-page py-8">
    <div class="print:hidden mb-6">
      <UButton
        to="/insights"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        size="sm"
        class="mb-4"
      >
        {{ $t('pages.insights.backToIndex') }}
      </UButton>
    </div>

    <UPageHeader
      :title="catalogEntry ? $t(catalogEntry.titleKey) : $t('pages.insights.unknownReport')"
      :description="catalogEntry ? $t(catalogEntry.descriptionKey) : undefined"
      class="mb-6"
    />

    <div
      v-if="!catalogEntry"
      class="text-muted"
    >
      {{ $t('pages.insights.unknownReport') }}
    </div>

    <template v-else>
      <div class="print:hidden mb-6 flex flex-wrap items-end gap-3">
        <UFormField :label="$t('pages.insights.filters.site')">
          <USelect
            v-model="siteId"
            :items="siteOptions"
            value-key="value"
            class="w-56"
          />
        </UFormField>
        <UFormField :label="$t('pages.insights.filters.asOf')">
          <UInput
            v-model="asOf"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UFormField :label="$t('pages.insights.filters.from')">
          <UInput
            v-model="from"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UFormField :label="$t('pages.insights.filters.to')">
          <UInput
            v-model="to"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UButton
          color="primary"
          :loading="pending"
          @click="onApply"
        >
          {{ $t('pages.insights.apply') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          :loading="downloading"
          @click="onCsv"
        >
          {{ $t('pages.insights.exportCsv') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-printer"
          @click="printReport"
        >
          {{ $t('pages.insights.print') }}
        </UButton>
      </div>

      <p
        v-if="error"
        class="text-error mb-4 text-sm"
      >
        {{ error }}
      </p>

      <div class="report-table-wrap">
        <UTable
          :data="result?.rows ?? []"
          :columns="columns"
          :loading="pending"
          class="w-full"
        />
      </div>

      <footer class="report-definitions-footer text-muted mt-8 border-t border-default pt-4 text-sm">
        {{ $t('pages.insights.definitionsFooter') }}
        <span class="text-highlighted">docs/report-definitions.md</span>
      </footer>
    </template>
  </UContainer>
</template>
