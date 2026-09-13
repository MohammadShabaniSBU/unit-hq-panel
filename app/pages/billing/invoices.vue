<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiInvoice, InvoiceKind } from '~/types/invoice'

const { t, locale } = useI18n()
const { formatDate } = useOrgDateFormat()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const selectedId = ref<number | null>(null)
const showDetail = ref(false)
const fromDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)
const toDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)

const {
  invoices,
  total,
  showingCount,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  kind,
  dateFrom,
  dateTo,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useInvoiceList()

function parseIsoDate(value: string): CalendarDate | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new CalendarDate(Number(y), Number(m), Number(d))
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const fromDateValue = computed({
  get: () => parseIsoDate(dateFrom.value),
  set: (value: CalendarDate | null) => {
    dateFrom.value = formatIsoDate(value)
  }
})

const toDateValue = computed({
  get: () => parseIsoDate(dateTo.value),
  set: (value: CalendarDate | null) => {
    dateTo.value = formatIsoDate(value)
  }
})

const kindItems = computed(() => [
  { value: null as InvoiceKind | null, label: t('billing.invoices.allKinds') },
  { value: 'ordinary' as InvoiceKind, label: t('billing.invoices.kinds.ordinary') },
  { value: 'simplified' as InvoiceKind, label: t('billing.invoices.kinds.simplified') },
  { value: 'rectificative' as InvoiceKind, label: t('billing.invoices.kinds.rectificative') }
])

function openDetail(invoice: ApiInvoice) {
  selectedId.value = invoice.id
  showDetail.value = true
}

function onRowSelect(_event: Event, row: TableRow<ApiInvoice>) {
  openDetail(row.original)
}

function formatAmount(amount: string, currency: string) {
  return formatMoney(amount, currency, locale.value)
}

const columns = computed<Array<TableColumn<ApiInvoice>>>(() => [
  {
    accessorKey: 'full_number',
    header: t('billing.invoices.fullNumber'),
    cell: ({ row }) => h('span', {
      class: 'font-medium text-highlighted'
    }, row.original.full_number)
  },
  {
    accessorKey: 'issue_date',
    header: t('billing.invoices.issueDate'),
    cell: ({ row }) => formatDate(row.original.issue_date, { empty: t('common.emptyValue') })
  },
  {
    id: 'contact',
    header: t('billing.invoices.contact'),
    cell: ({ row }) => row.original.contact?.name ?? `#${row.original.contact_id}`
  },
  {
    id: 'contract',
    header: t('billing.invoices.contract'),
    cell: ({ row }) => row.original.contract_id ? `#${row.original.contract_id}` : '—'
  },
  {
    id: 'kind',
    header: t('billing.invoices.kind'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.kind === 'rectificative'
        ? 'R'
        : t(`billing.invoices.kinds.${row.original.kind}`),
      color: row.original.kind === 'rectificative' ? 'warning' : 'neutral',
      variant: 'subtle'
    })
  },
  {
    id: 'total',
    header: t('billing.invoices.total'),
    cell: ({ row }) => {
      const negative = Number(row.original.gross_total) < 0
      return h('span', {
        class: negative ? 'text-error tabular-nums' : 'tabular-nums'
      }, formatAmount(row.original.gross_total, row.original.currency))
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UButton, {
      size: 'xs',
      variant: 'ghost',
      icon: 'i-lucide-eye',
      onClick: () => openDetail(row.original)
    })
  }
])
</script>

<template>
  <UContainer class="flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-8">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('billing.invoices.title') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('billing.invoices.subtitle') }}
      </p>
    </div>

    <div class="mt-6 flex shrink-0 flex-wrap items-end gap-3">
      <UFormField :label="$t('billing.invoices.kind')">
        <USelect
          v-model="kind"
          :items="kindItems"
          value-key="value"
          label-key="label"
          class="w-48"
        />
      </UFormField>
      <UFormField :label="$t('billing.invoices.dateFrom')">
        <UInputDate
          ref="fromDateInput"
          v-model="fromDateValue"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="fromDateInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('billing.invoices.dateFrom')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="fromDateValue"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
      <UFormField :label="$t('billing.invoices.dateTo')">
        <UInputDate
          ref="toDateInput"
          v-model="toDateValue"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="toDateInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('billing.invoices.dateTo')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="toDateValue"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
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
        {{ $t('billing.invoices.loadError') }}
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
      v-else-if="!invoices.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('billing.invoices.emptyTitle') }}
      </p>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('billing.invoices.emptyBody') }}
      </p>
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1 overflow-hidden rounded-lg border border-default">
        <UTable
          :data="invoices"
          :columns="columns"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        class="shrink-0"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="total"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <BillingInvoiceDetailSlideover
      v-model:open="showDetail"
      :invoice-id="selectedId"
      @navigate="(id: number) => { selectedId = id }"
    />
  </UContainer>
</template>
