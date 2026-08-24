<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiInvoice, InvoiceKind } from '~/types/invoice'

const { t, locale } = useI18n()
const { formatDate } = useOrgDateFormat()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const selectedId = ref<number | null>(null)
const showDetail = ref(false)

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
  goToNextPage
} = useInvoiceList()

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

function formatAmount(amount: string, currency: string) {
  return formatMoney(amount, currency, locale.value)
}

const columns = computed<Array<TableColumn<ApiInvoice>>>(() => [
  {
    accessorKey: 'full_number',
    header: t('billing.invoices.fullNumber'),
    cell: ({ row }) => h('button', {
      type: 'button',
      class: 'font-medium text-highlighted hover:underline',
      onClick: () => openDetail(row.original)
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
  <UContainer class="py-8">
    <UPageHeader
      :title="$t('billing.invoices.title')"
      :description="$t('billing.invoices.subtitle')"
    />

    <div class="mt-6 flex flex-wrap items-end gap-3">
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
        <UInput
          v-model="dateFrom"
          type="date"
        />
      </UFormField>
      <UFormField :label="$t('billing.invoices.dateTo')">
        <UInput
          v-model="dateTo"
          type="date"
        />
      </UFormField>
    </div>

    <div class="mt-6">
      <div
        v-if="pending"
        class="flex justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="$t('billing.invoices.loadError')"
        :actions="[{
          label: $t('common.retry'),
          color: 'neutral',
          variant: 'outline',
          onClick: () => refresh()
        }]"
      />

      <div
        v-else-if="!invoices.length"
        class="rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <p class="font-medium">
          {{ $t('billing.invoices.emptyTitle') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('billing.invoices.emptyBody') }}
        </p>
      </div>

      <template v-else>
        <UTable
          :data="invoices"
          :columns="columns"
        />
        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            {{ $t('common.showing', { count: showingCount, total }) }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-left"
              :disabled="!canGoPrev"
              @click="goToPrevPage"
            />
            <span class="text-sm tabular-nums">
              {{ page }} / {{ lastPage }}
            </span>
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-right"
              :disabled="!canGoNext"
              @click="goToNextPage"
            />
            <USelect
              v-model="perPage"
              :items="[25, 50, 100]"
              class="w-20"
            />
          </div>
        </div>
      </template>
    </div>

    <BillingInvoiceDetailSlideover
      v-model:open="showDetail"
      :invoice-id="selectedId"
      @navigate="(id: number) => { selectedId = id }"
    />
  </UContainer>
</template>
