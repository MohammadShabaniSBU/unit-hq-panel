<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { contractStatusColor } from '~/composables/useContractsList'
import { billingPeriodStatusColor } from '~/composables/useContactTransactions'
import { formatMoney } from '~/composables/useMoney'
import type {
  ApiContract,
  ApiContractItem,
  ApiContractItemInsurance,
  ApiContractItemUnit,
  ApiContractOccupancy,
  ContractStatus,
  TransferPayload,
  TransferPreview,
  VacatePayload,
  VacatePreview
} from '~/types/contract'
import type { ApiBillingPeriod } from '~/types/billing-period'
import type { ApiNextBill } from '~/types/billing'
import type { ApiPayment, PaymentMethod, RecordPaymentPayload } from '~/types/payment'
import type { ApiPaymentRequest } from '~/types/paymentRequest'

type ContractTab = 'overview' | 'items' | 'invoices' | 'billing_periods' | 'payments' | 'delinquency' | 'activity'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const UBadge = resolveComponent('UBadge')

const contractId = computed(() => String(route.params.id))

const validTabs: Array<ContractTab> = [
  'overview',
  'items',
  'invoices',
  'billing_periods',
  'payments',
  'delinquency',
  'activity'
]

function tabFromQuery(): ContractTab | null {
  const requested = route.query.tab
  return typeof requested === 'string' && validTabs.includes(requested as ContractTab)
    ? requested as ContractTab
    : null
}

const activeTab = ref<ContractTab>(tabFromQuery() ?? 'overview')

watch(activeTab, (tab) => {
  const current = route.query.tab
  if (tab === 'overview' && (current == null || current === 'overview')) return
  if (current === tab) return
  router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } })
})

watch(() => route.query.tab, () => {
  const fromQuery = tabFromQuery()
  if (fromQuery && fromQuery !== activeTab.value) {
    activeTab.value = fromQuery
  }
})

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

const contractNumericId = computed(() => Number(contractId.value) || null)
const {
  invoices: contractInvoices,
  total: contractInvoicesTotal,
  pending: invoicesPending,
  error: invoicesError,
  refresh: refreshInvoices
} = useInvoiceList({ contractId: contractNumericId })

const selectedInvoiceId = ref<number | null>(null)
const showInvoiceDetail = ref(false)

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

const { get, post } = useApi()
const billedThroughKey = computed(() => contract.value?.billed_through ?? '')
const { data: nextBillResponse } = useAsyncData(
  () => `contract-next-bill-${contractId.value}-${billedThroughKey.value}`,
  () => get<ApiNextBill | null>(`/api/contracts/${contractId.value}/next-bill`),
  { watch: [contractId, billedThroughKey] }
)
const nextBill = computed(() => nextBillResponse.value?.data ?? null)
const lastFailedRun = computed(() => billing.value?.last_failed_billing_run ?? null)

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

const itemHistory = computed(() => contract.value?.item_history ?? [])
const occupancyHistory = computed(() => contract.value?.occupancies ?? [])

const noticeOpen = ref(false)
const vacateOpen = ref(false)
const transferOpen = ref(false)
const withdrawOpen = ref(false)
const paymentOpen = ref(false)
const paymentRequestOpen = ref(false)
const createdPaymentRequest = ref<ApiPaymentRequest | null>(null)
const createdPaymentUrl = ref<string | null>(null)
const reverseOpen = ref(false)
const reversePaymentId = ref<number | null>(null)
const reverseReason = ref('')
const vacatePreview = ref<VacatePreview | null>(null)
const transferPreview = ref<TransferPreview | null>(null)
const actionError = ref<string | null>(null)
const toast = useToast()

const {
  pending: vacatePending,
  previewPending,
  giveNotice,
  withdrawNotice,
  previewVacate,
  vacate
} = useContractVacate(contractId)

const {
  pending: transferPending,
  previewPending: transferPreviewPending,
  previewTransfer,
  transfer
} = useContractTransfer(contractId)

const {
  pending: paymentPending,
  record: recordPayment,
  reverse: reversePayment
} = useManualPayment(contractId)

const {
  requests: paymentRequests,
  pending: paymentRequestsPending,
  submitting: paymentRequestSubmitting,
  actionError: paymentRequestActionError,
  refresh: refreshPaymentRequests,
  create: createPaymentRequest,
  cancel: cancelPaymentRequest
} = usePaymentRequests(contractId)

watch(contractId, () => {
  void refreshPaymentRequests()
}, { immediate: true })

const hasRequestableCharges = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return (contract.value?.charges ?? []).some((charge) => {
    const open = Number(charge.open_amount ?? charge.amount)
    return open > 0 && charge.due_date <= today
  })
})

const reversedPaymentIds = computed(() => {
  const ids = new Set<number>()
  for (const payment of contract.value?.payments ?? []) {
    if (payment.reversal_of_payment_id != null) {
      ids.add(payment.reversal_of_payment_id)
    }
  }
  return ids
})

function methodLabel(method: PaymentMethod | null | undefined) {
  if (!method) return null
  return t(`billing.payments.manual.methods.${method}`)
}

function canReversePayment(payment: ApiPayment) {
  return payment.reversal_of_payment_id == null && !reversedPaymentIds.value.has(payment.id)
}

async function onPaymentSubmit(payload: RecordPaymentPayload) {
  try {
    await recordPayment(payload)
    paymentOpen.value = false
    toast.add({
      title: t('billing.payments.manual.recordSuccess'),
      color: 'success'
    })
    await refresh()
  } catch {
    toast.add({
      title: t('billing.payments.manual.recordError'),
      color: 'error'
    })
  }
}

function openPaymentRequest() {
  createdPaymentRequest.value = null
  createdPaymentUrl.value = null
  paymentRequestOpen.value = true
}

async function onPaymentRequestSubmit(payload: { charge_ids: Array<number>, save_card: boolean }) {
  const created = await createPaymentRequest(payload)
  if (!created) {
    toast.add({
      title: paymentRequestActionError.value ?? t('billing.paymentRequests.createError'),
      color: 'error'
    })
    return
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  createdPaymentRequest.value = created
  createdPaymentUrl.value = `${origin}${created.url}`

  try {
    await navigator.clipboard.writeText(createdPaymentUrl.value)
    toast.add({ title: t('billing.paymentRequests.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('billing.paymentRequests.linkReady'), color: 'success' })
  }
}

async function onPaymentRequestCancel(id: number) {
  const ok = await cancelPaymentRequest(id)
  if (ok) {
    toast.add({ title: t('billing.paymentRequests.cancelSuccess'), color: 'success' })
  } else {
    toast.add({
      title: paymentRequestActionError.value ?? t('billing.paymentRequests.cancelError'),
      color: 'error'
    })
  }
}

async function copyPaymentRequestUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: t('billing.paymentRequests.linkCopied'), color: 'success' })
  } catch {
    toast.add({ title: t('billing.paymentRequests.copyFailed'), color: 'error' })
  }
}

function openReverse(payment: ApiPayment) {
  reversePaymentId.value = payment.id
  reverseReason.value = ''
  reverseOpen.value = true
}

async function onReverseConfirm() {
  if (reversePaymentId.value == null || !reverseReason.value.trim()) return
  try {
    await reversePayment(reversePaymentId.value, reverseReason.value.trim())
    reverseOpen.value = false
    toast.add({
      title: t('billing.payments.manual.reverseSuccess'),
      color: 'success'
    })
    await refresh()
  } catch {
    toast.add({
      title: t('billing.payments.manual.reverseError'),
      color: 'error'
    })
  }
}

const transitionActions = computed(() => {
  const transitions = contract.value?.allowed_transitions ?? []
  const actionable: Array<ContractStatus> = ['notice_given', 'ended', 'active', 'cancelled']

  const items = transitions
    .filter(status => actionable.includes(status))
    .filter((status) => {
      // "active" in allowed_transitions means notice withdrawal from notice_given
      if (status === 'active') {
        return contract.value?.status === 'notice_given'
      }
      // Cancel is offered for awaiting_signature (remote path never signed).
      if (status === 'cancelled') {
        return contract.value?.status === 'awaiting_signature'
      }
      return true
    })
    .map(status => ({
      label: t(`contracts.transitions.${status}`),
      onSelect: () => onTransitionSelect(status)
    }))

  if (contract.value?.can_transfer) {
    items.push({
      label: t('contracts.transfer.action'),
      onSelect: () => {
        actionError.value = null
        transferPreview.value = null
        transferOpen.value = true
      }
    })
  }

  return items
})

const noticeCountdown = computed(() => {
  if (!contract.value || contract.value.status !== 'notice_given') return null
  return {
    moveOut: contract.value.scheduled_move_out_on,
    billedThrough: contract.value.billed_through
  }
})

async function onTransitionSelect(status: ContractStatus) {
  actionError.value = null
  if (status === 'notice_given') {
    noticeOpen.value = true
    return
  }
  if (status === 'ended') {
    vacatePreview.value = null
    vacateOpen.value = true
    return
  }
  if (status === 'active') {
    withdrawOpen.value = true
    return
  }
  if (status === 'cancelled' && contract.value) {
    try {
      await post(`/api/contracts/${contract.value.id}/cancel`, {})
      toast.add({ title: t('contracts.transitions.cancelled'), color: 'success' })
      await refresh()
    } catch {
      actionError.value = t('contracts.signature.cancelError')
    }
  }
}

async function onNoticeSubmit(scheduledMoveOutOn: string) {
  try {
    const updated = await giveNotice(scheduledMoveOutOn)
    mergeContract(updated)
    noticeOpen.value = false
    await refresh()
  } catch {
    actionError.value = t('contracts.notice.error')
  }
}

async function onWithdrawConfirm() {
  try {
    const updated = await withdrawNotice()
    mergeContract(updated)
    withdrawOpen.value = false
    await refresh()
  } catch {
    actionError.value = t('contracts.notice.withdrawError')
  }
}

async function onVacatePreview(payload: VacatePayload) {
  try {
    vacatePreview.value = await previewVacate(payload)
  } catch {
    vacatePreview.value = null
  }
}

async function onVacateSubmit(payload: VacatePayload) {
  try {
    const updated = await vacate(payload)
    mergeContract(updated)
    vacateOpen.value = false
    await refresh()
  } catch {
    actionError.value = t('contracts.vacate.error')
  }
}

async function onTransferPreview(payload: TransferPayload) {
  try {
    transferPreview.value = await previewTransfer(payload)
  } catch {
    transferPreview.value = null
  }
}

async function onTransferSubmit(payload: TransferPayload) {
  try {
    const updated = await transfer(payload)
    mergeContract(updated)
    transferOpen.value = false
    await refresh()
  } catch {
    actionError.value = t('contracts.transfer.error')
  }
}

function occupancyWindowLabel(row: ApiContractOccupancy) {
  const from = formatCivilDate(row.started_on, locale.value)
  const to = row.ended_on
    ? formatCivilDate(row.ended_on, locale.value)
    : t('pages.contracts.detail.openEnded')

  return `${from} → ${to}`
}

function occupancyEndedReasonLabel(reason: string | null) {
  if (!reason) return t('contracts.transfer.currentUnit')
  const key = `contracts.transfer.endedReasons.${reason}`
  return t(key) !== key ? t(key) : reason
}

function changeReasonLabel(reason: ApiContractItem['change_reason']) {
  if (!reason) {
    return t('pages.contracts.detail.changeReason.original')
  }

  return t(`pages.contracts.detail.changeReason.${reason}`)
}

function itemWindowLabel(row: ApiContractItem) {
  const from = formatCivilDate(row.effective_from, locale.value)
  const to = row.effective_to
    ? formatCivilDate(row.effective_to, locale.value)
    : t('pages.contracts.detail.openEnded')

  return `${from} – ${to}`
}

function onNativeSaved(updated: Record<string, unknown>) {
  mergeContract(updated as ApiContract)
}

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
    count: contractInvoicesTotal.value || undefined
  },
  {
    key: 'billing_periods',
    label: t('pages.contracts.detail.tabs.billingPeriods'),
    count: contract.value?.billing_periods?.length
  },
  {
    key: 'payments',
    label: t('pages.contracts.detail.tabs.payments'),
    count: contract.value?.payments?.length
  },
  {
    key: 'delinquency',
    label: t('pages.contracts.detail.tabs.delinquency')
  },
  {
    key: 'activity',
    label: t('pages.contracts.detail.tabs.activity'),
    count: contract.value?.notes?.length
  }
])

function formatAmount(amount: string | undefined | null, currency?: string | null) {
  return formatMoney(amount, currency ?? contract.value?.currency ?? billing.value?.currency, locale.value)
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
  return t('pages.contracts.detail.coverageValue', {
    amount: formatMoney(insurance.coverage, insurance.currency, locale.value)
  })
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
    cell: ({ row }) => formatAmount(row.original.amount, row.original.currency)
  },
  {
    id: 'tax_rate',
    header: t('pages.contracts.detail.taxRate'),
    cell: ({ row }) => row.original.tax_rate_snapshot ? `${row.original.tax_rate_snapshot}%` : '—'
  },
  {
    id: 'base_rate',
    header: t('pages.contracts.detail.baseRate'),
    cell: ({ row }) => formatAmount(row.original.base_rate, row.original.currency)
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

const billingPeriodColumns = computed<Array<TableColumn<ApiBillingPeriod>>>(() => [
  {
    id: 'period',
    header: t('table.period'),
    cell: ({ row }) => `${row.original.billing_period_start} – ${row.original.billing_period_end}`
  },
  {
    id: 'total',
    header: t('table.amount'),
    cell: ({ row }) => formatAmount(row.original.total, row.original.currency)
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
      label: t(`billingPeriodStatus.${row.original.status}`),
      color: billingPeriodStatusColor(row.original.status),
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
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, formatAmount(row.original.amount, row.original.currency))
  },
  {
    id: 'method',
    header: t('billing.payments.manual.method'),
    cell: ({ row }) => {
      const label = methodLabel(row.original.method)
      return label
        ? h(UBadge, {
            label,
            color: 'neutral',
            variant: 'subtle',
            size: 'sm'
          })
        : '—'
    }
  },
  {
    id: 'date',
    header: t('table.date'),
    cell: ({ row }) => row.original.received_on ?? row.original.created_at
  },
  {
    id: 'allocated',
    header: t('table.allocated'),
    cell: ({ row }) => formatAmount(row.original.allocated_amount, row.original.currency)
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      if (row.original.reversal_of_payment_id) {
        return h(UBadge, {
          label: t('pages.contacts.transactions.reversal'),
          color: 'warning',
          variant: 'subtle',
          size: 'sm'
        })
      }
      if (reversedPaymentIds.value.has(row.original.id)) {
        return h(UBadge, {
          label: t('pages.contacts.transactions.reversal'),
          color: 'neutral',
          variant: 'subtle',
          size: 'sm'
        })
      }
      return '—'
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (!canReversePayment(row.original)) return null
      return h(resolveComponent('UButton'), {
        label: t('billing.payments.manual.reverse'),
        color: 'neutral',
        variant: 'ghost',
        size: 'xs',
        onClick: () => openReverse(row.original)
      })
    }
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
              :label="$t(`contracts.status.${contract.status}`)"
              :color="contractStatusColor(contract.status)"
              variant="subtle"
            />
            <UBadge
              v-if="contract.overlock?.active"
              :label="contract.overlock.pending_release
                ? $t('contracts.overlock.pendingRelease')
                : $t('contracts.overlock.label')"
              color="error"
              variant="subtle"
            />
            <UDropdownMenu
              v-if="transitionActions.length > 0"
              :items="[transitionActions]"
            >
              <UButton
                :label="$t('pages.contracts.detail.actions')"
                color="neutral"
                variant="outline"
                icon="i-lucide-ellipsis"
                trailing-icon="i-lucide-chevron-down"
              />
            </UDropdownMenu>
          </div>

          <p
            v-if="noticeCountdown"
            class="mt-2 text-sm text-muted"
          >
            {{ $t('contracts.notice.countdown', {
              moveOut: noticeCountdown.moveOut ?? '—',
              billedThrough: noticeCountdown.billedThrough ?? '—'
            }) }}
          </p>

          <p
            v-if="actionError"
            class="mt-3 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
          >
            {{ actionError }}
          </p>

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
        v-if="lastFailedRun"
        class="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-highlighted"
      >
        <p>
          {{ $t('pages.contracts.detail.failedBillingBanner') }}
        </p>
        <NuxtLink
          :to="`/billing/runs/${lastFailedRun.billing_run_id}`"
          class="mt-1 inline-flex font-medium text-primary hover:underline"
        >
          {{ $t('pages.contracts.detail.viewFailedRun') }}
        </NuxtLink>
      </div>
      <div
        v-if="isOverdue"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
      >
        <span>
          {{ $t('pages.contracts.detail.overdueBanner', { amount: formatAmount(billing?.overdue_amount) }) }}
        </span>
        <UButton
          v-if="hasRequestableCharges"
          size="xs"
          color="error"
          variant="soft"
          :label="$t('billing.paymentRequests.request')"
          @click="openPaymentRequest"
        />
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

      <UCard v-if="contract.status === 'ended' && contract.deposit_settlement">
        <template #header>
          <h2 class="text-sm font-medium text-dimmed">
            {{ $t('contracts.deposit.settlementSummary') }}
          </h2>
        </template>
        <dl class="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-dimmed">
              {{ $t('contracts.deposit.outcome') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ $t(`contracts.deposit.outcomes.${contract.deposit_settlement.outcome}`) }}
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              {{ $t('contracts.deposit.refunded') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ formatAmount(contract.deposit_settlement.refunded_amount, contract.deposit_settlement.currency) }}
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              {{ $t('contracts.deposit.payoutStatus') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ $t(`contracts.deposit.payoutStatuses.${contract.deposit_settlement.payout_status}`) }}
            </dd>
          </div>
        </dl>
        <p
          v-if="contract.deposit_settlement.payout_status === 'pending'"
          class="mt-3 text-sm text-muted"
        >
          {{ $t('contracts.vacate.payoutPendingNote') }}
        </p>
      </UCard>

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
            <EntityOverviewCards
              entity-type="contract"
              :entity="contract"
              @native-saved="onNativeSaved"
            />

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
                    {{ formatAmount(unitItem?.amount, unitItem?.currency) }}
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
                        amount: formatAmount(
                          (insuranceItem.item as ApiContractItemInsurance | null | undefined)?.coverage,
                          (insuranceItem.item as ApiContractItemInsurance | null | undefined)?.currency
                        )
                      }) }}
                    </p>
                    <p class="mt-2 text-sm text-highlighted">
                      {{ formatAmount(insuranceItem.amount, insuranceItem.currency) }}
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
            <ContractsContractSignatureCard
              :contract-id="contract.id"
              :status="contract.status"
              :signed-at="contract.signed_at"
              @refreshed="refresh"
            />

            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-medium text-dimmed">
                    {{ $t('pages.contracts.detail.billingSection') }}
                  </h2>
                  <div class="flex flex-wrap items-center gap-1">
                    <UButton
                      v-if="hasRequestableCharges"
                      size="xs"
                      color="primary"
                      variant="outline"
                      :label="$t('billing.paymentRequests.request')"
                      @click="openPaymentRequest"
                    />
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      :label="$t('billing.payments.manual.record')"
                      @click="paymentOpen = true"
                    />
                  </div>
                </div>
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
                  <dt class="flex items-center gap-1 text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.billedThroughLabel') }}
                    <UTooltip :text="$t('pages.contracts.detail.billedThroughTooltip')">
                      <UIcon
                        name="i-lucide-info"
                        class="size-3.5"
                      />
                    </UTooltip>
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ billing?.billed_through ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    {{ $t('pages.contracts.detail.nextBillLabel') }}
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    <template v-if="nextBill">
                      {{ nextBill.window.start }} → {{ nextBill.window.end }}
                      <span class="mt-0.5 block text-sm text-dimmed">
                        {{ formatAmount(nextBill.amount, nextBill.currency) }}
                      </span>
                    </template>
                    <template v-else>
                      {{ $t('common.emptyValue') }}
                    </template>
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

              <ContractsContractPaymentRequestsList
                :requests="paymentRequests"
                :pending="paymentRequestsPending"
                :currency="contract.currency"
                :cancelling="paymentRequestSubmitting"
                @cancel="onPaymentRequestCancel"
                @copy="copyPaymentRequestUrl"
              />

              <ContractsContractAutopayCard
                :contract-id="contract.id"
                :contact-id="contract.contact_id"
                :currency="contract.currency"
                @refreshed="refresh"
              />
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

        <div
          v-if="itemHistory.length > 0"
          class="mt-6"
        >
          <h3 class="mb-3 text-sm font-medium text-highlighted">
            {{ $t('pages.contracts.detail.itemHistory') }}
          </h3>
          <ul class="divide-y divide-default rounded-xl border border-default">
            <li
              v-for="row in itemHistory"
              :key="row.id"
              class="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="font-medium text-highlighted">
                  {{ itemLabel(row) }}
                  <span class="ml-2 text-dimmed">{{ changeReasonLabel(row.change_reason) }}</span>
                </p>
                <p class="text-dimmed">
                  {{ itemWindowLabel(row) }}
                </p>
              </div>
              <p class="font-medium text-highlighted">
                {{ formatAmount(row.amount, row.currency) }}
              </p>
            </li>
          </ul>
        </div>

        <div
          v-if="occupancyHistory.length > 1"
          class="mt-6"
        >
          <h3 class="mb-3 text-sm font-medium text-highlighted">
            {{ $t('contracts.transfer.occupancyHistory') }}
          </h3>
          <ul class="divide-y divide-default rounded-xl border border-default">
            <li
              v-for="(row, index) in occupancyHistory"
              :key="`${row.unit_id}-${row.started_on}-${index}`"
              class="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p class="font-medium text-highlighted">
                  {{ row.unit_number ?? `#${row.unit_id}` }}
                  <span class="ml-2 text-dimmed">{{ occupancyEndedReasonLabel(row.ended_reason) }}</span>
                </p>
                <p class="text-dimmed">
                  {{ occupancyWindowLabel(row) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </template>

      <template v-if="activeTab === 'invoices'">
        <div
          v-if="invoicesPending"
          class="flex min-h-40 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>
        <UAlert
          v-else-if="invoicesError"
          color="error"
          variant="subtle"
          :title="$t('billing.invoices.loadError')"
          :actions="[{
            label: $t('common.retry'),
            color: 'neutral',
            variant: 'outline',
            onClick: () => refreshInvoices()
          }]"
        />
        <div
          v-else-if="!contractInvoices.length"
          class="flex min-h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-default bg-elevated/30 px-4 text-center"
        >
          <p class="text-sm font-medium">
            {{ $t('billing.invoices.emptyTitle') }}
          </p>
          <p class="text-sm text-dimmed">
            {{ $t('billing.invoices.emptyBody') }}
          </p>
        </div>
        <ul
          v-else
          class="divide-y divide-default rounded-xl border border-default"
        >
          <li
            v-for="invoice in contractInvoices"
            :key="invoice.id"
            class="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-elevated/40"
            @click="selectedInvoiceId = invoice.id; showInvoiceDetail = true"
          >
            <div>
              <div class="font-medium">
                {{ invoice.full_number }}
              </div>
              <div class="text-xs text-dimmed">
                {{ invoice.issue_date }} · {{ $t(`billing.invoices.kinds.${invoice.kind}`) }}
              </div>
            </div>
            <div
              class="tabular-nums text-sm"
              :class="Number(invoice.gross_total) < 0 ? 'text-error' : ''"
            >
              {{ formatAmount(invoice.gross_total, invoice.currency) }}
            </div>
          </li>
        </ul>
        <BillingInvoiceDetailSlideover
          v-model:open="showInvoiceDetail"
          :invoice-id="selectedInvoiceId"
          @navigate="(id: number) => { selectedInvoiceId = id }"
        />
      </template>

      <template v-if="activeTab === 'billing_periods'">
        <div
          v-if="!contract.billing_periods?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noBillingPeriods') }}
          </p>
        </div>
        <UTable
          v-else
          :data="contract.billing_periods"
          :columns="billingPeriodColumns"
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

      <template v-if="activeTab === 'delinquency'">
        <ContractsContractDelinquencyTab
          :contract-id="contract.id"
          :currency="contract.currency"
          :unit-id="unitItem?.item_id ?? null"
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

    <ContractsContractNoticeFormSlideover
      v-model:open="noticeOpen"
      :notice-period-days="contract?.notice_period_days ?? 14"
      :submitting="vacatePending"
      @submit="onNoticeSubmit"
    />

    <ContractsContractVacateFormSlideover
      v-model:open="vacateOpen"
      :deposit-amount="contract?.deposit_amount ?? '0.00'"
      :currency="contract?.currency ?? 'EUR'"
      :scheduled-move-out-on="contract?.scheduled_move_out_on"
      :submitting="vacatePending"
      :preview-pending="previewPending"
      :preview="vacatePreview"
      @preview="onVacatePreview"
      @submit="onVacateSubmit"
    />

    <ContractsContractTransferFormSlideover
      v-model:open="transferOpen"
      :origin-amount="unitItem?.amount ?? '0.00'"
      :currency="contract?.currency ?? 'EUR'"
      :submitting="transferPending"
      :preview-pending="transferPreviewPending"
      :preview="transferPreview"
      @preview="onTransferPreview"
      @submit="onTransferSubmit"
    />

    <UModal
      v-model:open="withdrawOpen"
      :title="$t('contracts.notice.withdrawTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('contracts.notice.withdrawBody') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="withdrawOpen = false"
          />
          <UButton
            :label="$t('contracts.notice.withdrawConfirm')"
            :loading="vacatePending"
            @click="onWithdrawConfirm"
          />
        </div>
      </template>
    </UModal>

    <ContractsContractPaymentFormSlideover
      v-model:open="paymentOpen"
      :overdue-amount="billing?.overdue_amount ?? '0.00'"
      :currency="contract?.currency ?? billing?.currency ?? 'EUR'"
      :charges="contract?.charges ?? []"
      :submitting="paymentPending"
      @submit="onPaymentSubmit"
    />

    <ContractsContractPaymentRequestSlideover
      v-model:open="paymentRequestOpen"
      :charges="contract?.charges ?? []"
      :currency="contract?.currency ?? billing?.currency ?? 'EUR'"
      :submitting="paymentRequestSubmitting"
      :created-request="createdPaymentRequest"
      :payment-url="createdPaymentUrl"
      @submit="onPaymentRequestSubmit"
    />

    <UModal
      v-model:open="reverseOpen"
      :title="$t('billing.payments.manual.reverseTitle')"
    >
      <template #body>
        <UFormField :label="$t('billing.payments.manual.reverseReason')">
          <UTextarea
            v-model="reverseReason"
            :rows="3"
            autofocus
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="reverseOpen = false"
          />
          <UButton
            :label="$t('billing.payments.manual.reverseConfirm')"
            color="warning"
            :loading="paymentPending"
            :disabled="!reverseReason.trim()"
            @click="onReverseConfirm"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
