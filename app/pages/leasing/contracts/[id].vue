<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { contractStatusColor } from '~/composables/useContractsList'
import { invoiceStatusColor } from '~/composables/useContactTransactions'
import {
  CONTRACT_STATUSES,
  type ApiContractItem,
  type ApiContractItemInsurance,
  type ApiContractItemUnit,
  type ContractStatus
} from '~/types/contract'
import type { ApiInvoice } from '~/types/invoice'
import type { ApiPayment } from '~/types/payment'

type ContractTab = 'overview' | 'items' | 'invoices' | 'payments' | 'activity'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const UBadge = resolveComponent('UBadge')

const contractId = computed(() => String(route.params.id))
const activeTab = ref<ContractTab>('overview')

const {
  contract,
  unitItem,
  insuranceItem,
  pending,
  error,
  refresh,
  mergeContract,
  addNote
} = useContractDetail(contractId.value)

const { updateField, updatingField, fieldErrors } = useContractUpdate(contractId)

const contactName = computed(() =>
  contract.value?.contact?.name ?? (contract.value ? `#${contract.value.contact_id}` : '')
)

const unitNumber = computed(() => {
  const item = unitItem.value?.item as ApiContractItemUnit | null | undefined
  return item?.unit_number ?? (unitItem.value ? `#${unitItem.value.item_id}` : '—')
})

const siteName = computed(() => {
  const item = unitItem.value?.item as ApiContractItemUnit | null | undefined
  return item?.site?.name ?? '—'
})

const unitClassLabel = computed(() => {
  const item = unitItem.value?.item as ApiContractItemUnit | null | undefined
  return item?.unit_class?.label ?? '—'
})

const billing = computed(() => contract.value?.billing_summary)

const billingCadenceLabel = computed(() => {
  if (!contract.value) return '—'

  const cadence = formatBillingCadence(contract.value.billing_interval, contract.value.billing_interval_count, t)
  const anchorKey = `pages.contracts.detail.anchorModel.${contract.value.billing_anchor_model}`

  return `${cadence} · ${t(anchorKey)}`
})

const isOverdue = computed(() => {
  const amount = Number(billing.value?.overdue_amount ?? 0)
  return amount > 0
})

const statusOptions = computed(() =>
  CONTRACT_STATUSES.map(status => ({
    label: t(`contractStatus.${status}`),
    value: status
  }))
)

const tabs = computed<Array<{ key: ContractTab, label: string, count?: number }>>(() => [
  { key: 'overview', label: t('pages.contracts.detail.tabs.overview') },
  {
    key: 'items',
    label: t('pages.contracts.detail.tabs.items'),
    count: contract.value?.items?.length
  },
  {
    key: 'invoices',
    label: t('pages.contracts.detail.tabs.invoices'),
    count: contract.value?.invoices?.length
  },
  {
    key: 'payments',
    label: t('pages.contracts.detail.tabs.payments'),
    count: contract.value?.payments?.length
  },
  {
    key: 'activity',
    label: t('pages.contracts.detail.tabs.activity'),
    count: contract.value?.notes?.length
  }
])

function formatAmount(amount: string | undefined | null) {
  if (amount == null || amount === '') return '—'
  return `£${amount}`
}

function itemLabel(row: ApiContractItem) {
  if (row.item_type === 'unit') {
    const unit = row.item as ApiContractItemUnit | null | undefined
    return unit?.unit_number ?? `#${row.item_id}`
  }

  const insurance = row.item as ApiContractItemInsurance | null | undefined
  return insurance?.name ?? `#${row.item_id}`
}

function itemDetail(row: ApiContractItem) {
  if (row.item_type === 'unit') {
    const unit = row.item as ApiContractItemUnit | null | undefined
    const parts = [unit?.site?.name, unit?.unit_class?.label].filter(Boolean)
    return parts.length ? parts.join(' · ') : '—'
  }

  const insurance = row.item as ApiContractItemInsurance | null | undefined
  if (!insurance) return '—'
  return t('pages.contracts.detail.coverageValue', { amount: insurance.coverage })
}

async function onContractFieldSave(field: string, value: string | null) {
  const updated = await updateField(field, value)

  if (updated) {
    mergeContract(updated)
    toast.add({ title: t('forms.contract.updateSuccessMessage'), color: 'success' })
  }
}

const itemColumns = computed<Array<TableColumn<ApiContractItem>>>(() => [
  {
    id: 'type',
    header: t('table.type'),
    cell: ({ row }) => t(`pages.contracts.detail.itemType.${row.original.item_type}`)
  },
  {
    id: 'item',
    header: t('pages.contracts.detail.item'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, itemLabel(row.original))
  },
  {
    id: 'detail',
    header: t('pages.contracts.detail.itemDetail'),
    cell: ({ row }) => itemDetail(row.original)
  },
  {
    id: 'amount',
    header: t('pages.contracts.detail.rate'),
    cell: ({ row }) => formatAmount(row.original.amount)
  },
  {
    id: 'tax_rate',
    header: t('pages.contracts.detail.taxRate'),
    cell: ({ row }) => row.original.tax_rate_snapshot ? `${row.original.tax_rate_snapshot}%` : '—'
  },
  {
    id: 'base_rate',
    header: t('pages.contracts.detail.baseRate'),
    cell: ({ row }) => formatAmount(row.original.base_rate)
  },
  {
    id: 'discount',
    header: t('forms.contract.discount'),
    cell: ({ row }) => row.original.discount?.label ?? '—'
  },
  {
    id: 'discount_ends_at',
    header: t('pages.contracts.detail.discountEndsAt'),
    cell: ({ row }) => row.original.discount_ends_at ?? '—'
  }
])

const invoiceColumns = computed<Array<TableColumn<ApiInvoice>>>(() => [
  {
    id: 'period',
    header: t('table.period'),
    cell: ({ row }) => `${row.original.billing_period_start} – ${row.original.billing_period_end}`
  },
  {
    id: 'total',
    header: t('table.amount'),
    cell: ({ row }) => formatAmount(row.original.total)
  },
  {
    id: 'charges',
    header: t('table.charges'),
    cell: ({ row }) => row.original.charges_count ?? '—'
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`invoiceStatus.${row.original.status}`),
      color: invoiceStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'issued_at',
    header: t('pages.contracts.detail.issuedAt'),
    cell: ({ row }) => row.original.issued_at ?? '—'
  }
])

const paymentColumns = computed<Array<TableColumn<ApiPayment>>>(() => [
  {
    id: 'amount',
    header: t('table.amount'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, formatAmount(row.original.amount))
  },
  {
    id: 'date',
    header: t('table.date'),
    cell: ({ row }) => row.original.created_at
  },
  {
    id: 'allocated',
    header: t('table.allocated'),
    cell: ({ row }) => formatAmount(row.original.allocated_amount)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => row.original.reversal_of_payment_id
      ? h(UBadge, {
          label: t('pages.contacts.transactions.reversal'),
          color: 'warning',
          variant: 'subtle',
          size: 'sm'
        })
      : '—'
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div
      v-if="pending"
      class="flex items-center justify-center py-24"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error || !contract"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        {{ $t('pages.contracts.detail.loadError') }}
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
      class="flex flex-col gap-6"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <nav class="mb-3 flex items-center gap-1.5 text-sm text-dimmed">
            <NuxtLink
              to="/leasing/contracts"
              class="hover:text-highlighted"
            >
              {{ $t('pages.contracts.title') }}
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <span class="text-highlighted">
              {{ $t('pages.contracts.detail.breadcrumb', { id: contract.id }) }}
            </span>
          </nav>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-highlighted">
              {{ $t('pages.contracts.detail.title', { id: contract.id }) }}
            </h1>
            <UBadge
              :label="$t(`contractStatus.${contract.status}`)"
              :color="contractStatusColor(contract.status)"
              variant="subtle"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
            <NuxtLink
              :to="`/leasing/contacts/${contract.contact_id}`"
              class="inline-flex items-center gap-1.5 hover:text-highlighted"
            >
              <UIcon
                name="i-lucide-user"
                class="size-3.5"
              />
              {{ contactName }}
            </NuxtLink>
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-box"
                class="size-3.5"
              />
              {{ $t('pages.contracts.detail.unitMeta', { unit: unitNumber }) }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-map-pin"
                class="size-3.5"
              />
              {{ siteName }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-calendar"
                class="size-3.5"
              />
              {{ $t('pages.contracts.detail.startMeta', { date: contract.start_date }) }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink :to="`/leasing/contacts/${contract.contact_id}`">
            <UButton
              :label="$t('pages.contracts.detail.viewContact')"
              color="neutral"
              variant="outline"
              icon="i-lucide-user"
            />
          </NuxtLink>
          <NuxtLink
            v-if="contract.deal_id"
            :to="`/leasing/deals/${contract.deal_id}`"
          >
            <UButton
              :label="$t('pages.contracts.detail.viewDeal')"
              color="neutral"
              variant="outline"
              icon="i-lucide-handshake"
            />
          </NuxtLink>
          <NuxtLink
            v-if="contract.reservation_id"
            :to="`/leasing/reservations/${contract.reservation_id}`"
          >
            <UButton
              :label="$t('pages.contracts.detail.viewReservation')"
              color="neutral"
              variant="outline"
              icon="i-lucide-bookmark"
            />
          </NuxtLink>
        </div>
      </div>

      <div
        v-if="isOverdue"
        class="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
      >
        {{ $t('pages.contracts.detail.overdueBanner', { amount: formatAmount(billing?.overdue_amount) }) }}
      </div>
      <div
        v-else-if="billing"
        class="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-default bg-elevated/30 px-4 py-3 text-sm text-dimmed"
      >
        <span>
          {{ $t('pages.contracts.detail.billedThrough', { date: billing.billed_through ?? '—' }) }}
        </span>
        <span>
          {{ $t('pages.contracts.detail.balanceOwed', { amount: formatAmount(billing.balance_owed) }) }}
        </span>
        <span>
          {{ $t('pages.contracts.detail.unallocatedCredit', { amount: formatAmount(billing.unallocated_credit) }) }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1 border-b border-default pb-3">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          color="neutral"
          :variant="activeTab === tab.key ? 'solid' : 'ghost'"
          size="sm"
          class="rounded-full"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="tab.count"
            class="ms-1 tabular-nums"
          >
            {{ tab.count }}
          </span>
        </UButton>
      </div>

      <div v-show="activeTab === 'overview'">
        <div class="grid gap-4 xl:grid-cols-3">
          <div class="flex flex-col gap-4 xl:col-span-2">
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  {{ $t('pages.contracts.detail.detailsSection') }}
                </h2>
              </template>

              <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <InlineField
                  :label="$t('forms.contract.startDate')"
                  :value="contract.start_date"
                  type="date"
                  :nullable="false"
                  :loading="updatingField === 'start_date'"
                  :error="fieldErrors.start_date"
                  @save="onContractFieldSave('start_date', $event)"
                />
                <InlineField
                  :label="$t('forms.contract.endDate')"
                  :value="contract.end_date"
                  type="date"
                  :loading="updatingField === 'end_date'"
                  :error="fieldErrors.end_date"
                  @save="onContractFieldSave('end_date', $event)"
                />
                <InlineField
                  :label="$t('table.status')"
                  :value="contract.status"
                  :display-value="$t(`contractStatus.${contract.status as ContractStatus}`)"
                  type="select"
                  :options="statusOptions"
                  :nullable="false"
                  :loading="updatingField === 'status'"
                  :error="fieldErrors.status"
                  @save="onContractFieldSave('status', $event)"
                />
                <InlineField
                  :label="$t('forms.contract.signedAt')"
                  :value="contract.signed_at?.slice(0, 10) ?? null"
                  type="date"
                  :nullable="false"
                  :loading="updatingField === 'signed_at'"
                  :error="fieldErrors.signed_at"
                  @save="onContractFieldSave('signed_at', $event)"
                />
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  {{ $t('pages.contracts.detail.lineItemsPreview') }}
                </h2>
              </template>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                    {{ $t('forms.contract.unit') }}
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ unitNumber }}
                  </p>
                  <p class="text-sm text-dimmed">
                    {{ unitClassLabel }} · {{ siteName }}
                  </p>
                  <p class="mt-2 text-sm text-highlighted">
                    {{ formatAmount(unitItem?.amount) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                    {{ $t('forms.contract.insurance') }}
                  </p>
                  <template v-if="insuranceItem">
                    <p class="mt-1 font-medium text-highlighted">
                      {{ (insuranceItem.item as ApiContractItemInsurance | null | undefined)?.name ?? '—' }}
                    </p>
                    <p class="text-sm text-dimmed">
                      {{ $t('pages.contracts.detail.coverageValue', {
                        amount: (insuranceItem.item as ApiContractItemInsurance | null | undefined)?.coverage ?? '—'
                      }) }}
                    </p>
                    <p class="mt-2 text-sm text-highlighted">
                      {{ formatAmount(insuranceItem.amount) }}
                    </p>
                  </template>
                  <p
                    v-else
                    class="mt-1 text-sm text-dimmed"
                  >
                    {{ $t('pages.contracts.detail.noInsurance') }}
                  </p>
                </div>
              </div>
            </UCard>

            <ContractNotesCard
              :contract-id="contract.id"
              :notes="contract.notes"
              @added="addNote"
            />
          </div>

          <div class="flex flex-col gap-4">
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  {{ $t('pages.contracts.detail.billingSection') }}
                </h2>
              </template>

              <dl class="grid gap-4 text-sm">
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.billingCadenceLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ billingCadenceLabel }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.depositAmountLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ formatAmount(contract.deposit_amount) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.billedThroughLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ billing?.billed_through ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.balanceOwedLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ formatAmount(billing?.balance_owed) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.overdueLabel') }}
                  </dt>
                  <dd
                    class="mt-1 font-medium"
                    :class="isOverdue ? 'text-error' : 'text-highlighted'"
                  >
                    {{ formatAmount(billing?.overdue_amount) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.unallocatedCreditLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ formatAmount(billing?.unallocated_credit) }}
                  </dd>
                </div>
              </dl>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  {{ $t('pages.contracts.detail.pipelineSection') }}
                </h2>
              </template>

              <div class="flex flex-col gap-3 text-sm">
                <NuxtLink
                  :to="`/leasing/contacts/${contract.contact_id}`"
                  class="flex items-center justify-between hover:opacity-80"
                >
                  <span class="text-dimmed">{{ $t('table.contact') }}</span>
                  <span class="font-medium text-highlighted">{{ contactName }}</span>
                </NuxtLink>
                <NuxtLink
                  v-if="contract.deal_id"
                  :to="`/leasing/deals/${contract.deal_id}`"
                  class="flex items-center justify-between hover:opacity-80"
                >
                  <span class="text-dimmed">{{ $t('table.deal') }}</span>
                  <span class="font-medium text-highlighted">#{{ contract.deal_id }}</span>
                </NuxtLink>
                <NuxtLink
                  v-if="contract.reservation_id"
                  :to="`/leasing/reservations/${contract.reservation_id}`"
                  class="flex items-center justify-between hover:opacity-80"
                >
                  <span class="text-dimmed">{{ $t('pages.contracts.detail.reservation') }}</span>
                  <span class="font-medium text-highlighted">#{{ contract.reservation_id }}</span>
                </NuxtLink>
                <p
                  v-if="!contract.deal_id && !contract.reservation_id"
                  class="text-dimmed"
                >
                  {{ $t('pages.contracts.detail.walkIn') }}
                </p>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <template v-if="activeTab === 'items'">
        <div
          v-if="!contract.items?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contracts.detail.noItems') }}
          </p>
        </div>
        <UTable
          v-else
          :data="contract.items"
          :columns="itemColumns"
          class="w-full"
        />
      </template>

      <template v-if="activeTab === 'invoices'">
        <div
          v-if="!contract.invoices?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noInvoices') }}
          </p>
        </div>
        <UTable
          v-else
          :data="contract.invoices"
          :columns="invoiceColumns"
          class="w-full"
        />
      </template>

      <template v-if="activeTab === 'payments'">
        <div
          v-if="!contract.payments?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noPayments') }}
          </p>
        </div>
        <UTable
          v-else
          :data="contract.payments"
          :columns="paymentColumns"
          class="w-full"
        />
      </template>

      <template v-if="activeTab === 'activity'">
        <div class="flex flex-col gap-6">
          <ActivityTimeline
            subject-type="contract"
            :subject-id="contract.id"
          />

          <div
            v-if="contract.notes?.length"
            class="flex flex-col gap-3"
          >
            <UCard
              v-for="note in contract.notes"
              :key="`note-${note.id}`"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-lucide-sticky-note"
                  class="mt-0.5 size-4 shrink-0 text-dimmed"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="font-medium text-highlighted">
                      {{ note.employee?.name ?? $t('pages.contracts.detail.noteFallback') }}
                    </p>
                    <span class="shrink-0 text-xs text-dimmed">
                      {{ note.created_at }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ note.content }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </div>
  </UContainer>
</template>
