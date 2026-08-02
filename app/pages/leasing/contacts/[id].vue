<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { dealStatusColor } from '~/composables/useDealsList'
import { contractStatusColor } from '~/composables/useContractsList'
import { reservationStatusColor } from '~/composables/useReservationsList'
import { billingPeriodStatusColor } from '~/composables/useContactTransactions'
import { formatMoney } from '~/composables/useMoney'
import type { ApiContact } from '~/types/contact'
import type { ApiBillingPeriod } from '~/types/billing-period'
import type { ApiPayment } from '~/types/payment'
import type { InteractionChannel, InteractionCreatedPayload, InteractionDirection } from '~/types/interaction'

type ContactTab = 'overview' | 'activity' | 'deals' | 'reservations' | 'contracts' | 'invoices' | 'billing_periods' | 'payments' | 'files'

const route = useRoute()
const { t, locale } = useI18n()
const toast = useToast()

const UBadge = resolveComponent('UBadge')

const contactId = computed(() => String(route.params.id))

const {
  contact,
  activeContract,
  openDeal,
  pendingTasks,
  pending,
  error,
  refresh,
  mergeContact,
  addChannel,
  updateChannel,
  removeChannel,
  addAddress,
  updateAddress,
  removeAddress,
  addTask,
  updateTask,
  addNote
} = useContactDetail(contactId.value)

const {
  billingPeriods,
  payments,
  pending: transactionsPending,
  error: transactionsError,
  loaded: transactionsLoaded,
  ensureLoaded: ensureTransactionsLoaded
} = useContactTransactions(contactId)

const contactNumericId = computed(() => Number(contactId.value) || null)
const {
  invoices: contactInvoices,
  total: contactInvoicesTotal,
  pending: invoicesPending,
  error: invoicesError,
  refresh: refreshInvoices
} = useInvoiceList({ contactId: contactNumericId })

const selectedInvoiceId = ref<number | null>(null)
const showInvoiceDetail = ref(false)

const {
  interactions,
  pending: interactionsPending,
  error: interactionsError,
  refresh: refreshInteractions,
  createInteraction
} = useInteractionList(contactId)

const { isAuthenticated } = useAuth()
const echo = useEcho()

const activeTab = ref<ContactTab>('overview')
const showDealForm = ref(false)
const activityOpen = ref(true)

function scrollToFiscalHash() {
  if (route.hash !== '#fiscal') return
  activeTab.value = 'overview'
  nextTick(() => {
    document.getElementById('fiscal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

watch(() => [route.hash, pending.value, contact.value?.id] as const, () => {
  if (!pending.value && contact.value) {
    scrollToFiscalHash()
  }
}, { immediate: true })

const interactionChannel = ref<InteractionChannel>('call')
const interactionDirection = ref<InteractionDirection>('outbound')
const interactionSummary = ref('')
const interactionContent = ref('')
const loggingInteraction = ref(false)

const interactionChannelOptions = computed(() =>
  (['email', 'sms', 'whatsapp', 'call', 'other'] as Array<InteractionChannel>).map(value => ({
    label: value,
    value
  }))
)

const interactionDirectionOptions = computed(() =>
  (['inbound', 'outbound'] as Array<InteractionDirection>).map(value => ({
    label: value,
    value
  }))
)

async function onLogInteraction() {
  loggingInteraction.value = true
  try {
    await createInteraction({
      channel: interactionChannel.value,
      direction: interactionDirection.value,
      summary: interactionSummary.value || undefined,
      content: interactionContent.value || undefined
    })
    interactionSummary.value = ''
    interactionContent.value = ''
  } catch {
    toast.add({
      title: t('pages.contacts.interactions.loadError'),
      color: 'error'
    })
  } finally {
    loggingInteraction.value = false
  }
}

watch([contactId, isAuthenticated], ([id, authed], previous) => {
  const prevId = previous?.[0]

  if (prevId) {
    echo.leave(`contact.${prevId}`)
  }

  if (!authed || !id) {
    return
  }

  echo.private(`contact.${id}`)
    .listen('.interaction.created', (_payload: InteractionCreatedPayload) => {
      refreshInteractions()
      toast.add({
        title: t('pages.contacts.interactions.createdLive'),
        color: 'success'
      })
    })
}, { immediate: true })

onUnmounted(() => {
  if (contactId.value) {
    echo.leave(`contact.${contactId.value}`)
  }
})

watch([activeTab, contactId], ([tab]) => {
  if (tab === 'billing_periods' || tab === 'payments') {
    ensureTransactionsLoaded()
  }
})

const activityCardUi = computed(() => ({
  header: activityOpen.value ? undefined : 'px-4 py-3 sm:px-6',
  body: activityOpen.value ? undefined : 'p-0 min-h-0 overflow-hidden'
}))

function onNativeSaved(updated: Record<string, unknown>) {
  mergeContact(updated as ApiContact)
}

const initials = computed(() => {
  if (!contact.value) return '?'
  return [contact.value.first_name, contact.value.last_name]
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const primaryPhone = computed(() => {
  const channels = contact.value?.channels ?? []
  const primary = channels.find(c => c.type === 'phone' && c.is_primary)
  if (primary?.value) {
    return primary.value
  }
  return channels.find(c => c.type === 'phone')?.value ?? null
})

const fullName = computed(() =>
  contact.value
    ? [contact.value.first_name, contact.value.last_name].filter(Boolean).join(' ')
    : ''
)

const lifecycleStatusColor = computed(() => {
  const s = contact.value?.status
  if (s === 'tenant')
    return 'success'

  if (s === 'opportunity')
    return 'info'

  if (s === 'lead')
    return 'warning'

  if (s === 'lost')
    return 'error'

  return 'neutral'
})

const tabs = computed<Array<{ key: ContactTab; label: string; count?: number }>>(() => [
  { key: 'overview', label: t('pages.contacts.tabs.overview') },
  { key: 'activity', label: t('pages.contacts.tabs.activity') },
  { key: 'deals', label: t('pages.contacts.tabs.deals'), count: contact.value?.deals?.length },
  { key: 'reservations', label: t('pages.contacts.tabs.reservations'), count: contact.value?.reservations?.length },
  { key: 'contracts', label: t('pages.contacts.tabs.contracts'), count: contact.value?.contracts?.length },
  {
    key: 'invoices',
    label: t('pages.contacts.tabs.invoices'),
    count: contactInvoicesTotal.value || undefined
  },
  {
    key: 'billing_periods',
    label: t('pages.contacts.tabs.billingPeriods'),
    count: transactionsLoaded.value ? billingPeriods.value.length : undefined
  },
  {
    key: 'payments',
    label: t('pages.contacts.tabs.payments'),
    count: transactionsLoaded.value ? payments.value.length : undefined
  },
  { key: 'files', label: t('pages.contacts.tabs.files') }
])

function onDealSaved() {
  refresh()
  toast.add({ title: t('forms.deal.createSuccessMessage'), color: 'success' })
}

function formatAmount(amount: string | undefined | null, currency?: string | null) {
  return formatMoney(amount, currency, locale.value)
}

function contractUnitLabel(unitNumber: string | null | undefined, contractId: number) {
  return unitNumber
    ? t('pages.contacts.transactions.unitLabel', { unit: unitNumber })
    : t('pages.contacts.transactions.contractLabel', { id: contractId })
}

const billingPeriodColumns = computed<Array<TableColumn<ApiBillingPeriod>>>(() => [
  {
    id: 'period',
    header: t('table.period'),
    cell: ({ row }) => `${row.original.billing_period_start} – ${row.original.billing_period_end}`
  },
  {
    id: 'unit',
    header: t('table.unit'),
    cell: ({ row }) => contractUnitLabel(row.original.contract?.unit_number, row.original.contract_id)
  },
  {
    id: 'total',
    header: t('table.amount'),
    cell: ({ row }) => formatAmount(row.original.total, row.original.currency ?? row.original.contract?.currency)
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
  }
])

const paymentColumns = computed<Array<TableColumn<ApiPayment>>>(() => [
  {
    id: 'amount',
    header: t('table.amount'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, formatAmount(row.original.amount, row.original.currency))
  },
  {
    id: 'unit',
    header: t('table.unit'),
    cell: ({ row }) => contractUnitLabel(row.original.contract?.unit_number, row.original.contract_id)
  },
  {
    id: 'date',
    header: t('table.date'),
    cell: ({ row }) => row.original.created_at
  },
  {
    id: 'allocated',
    header: t('table.allocated'),
    cell: ({ row }) => formatAmount(row.original.allocated_amount, row.original.currency)
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
      v-else-if="error || !contact"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        Failed to load contact.
      </p>
      <UButton
        label="Retry"
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
      <!-- Header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex min-w-0 items-start gap-4">
          <UAvatar
            :text="initials"
            size="xl"
            class="shrink-0 bg-elevated text-lg font-semibold text-highlighted"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-semibold text-highlighted">
                {{ fullName }}
              </h1>
              <UBadge
                :color="lifecycleStatusColor"
                variant="subtle"
                :label="$t(`status.contact.${contact.status}`)"
              />
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
              <span
                v-if="contact.company"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-building-2"
                  class="size-3.5"
                />
                {{ contact.company }}
              </span>
              <span
                v-if="contact.email"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-3.5"
                />
                {{ contact.email }}
              </span>
              <span
                v-if="contact.source"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-lucide-tag"
                  class="size-3.5"
                />
                {{ $t(`contactSource.${contact.source}`) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <CallsCallButton
            v-if="primaryPhone"
            :contact-id="contact.id"
            :to-number="primaryPhone"
            context-type="contact"
            :context-id="contact.id"
            :label="$t('calls.call')"
            size="sm"
            color="neutral"
            variant="outline"
          />
          <UButton
            icon="i-lucide-plus"
            :label="$t('pages.contacts.newDeal')"
            color="primary"
            @click="showDealForm = true"
          />
        </div>
      </div>

      <!-- Tabs -->
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

      <!-- Overview tab -->
      <template v-if="activeTab === 'overview'">
        <!-- Stats row -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Active contract
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeContract ? ((activeContract.items?.find(i => i.item_type === 'unit')?.item as { unit_number?: string } | null | undefined)?.unit_number ?? '—') : 'None' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeContract ? ((activeContract.items?.find(i => i.item_type === 'unit')?.item as { site?: { name?: string } } | null | undefined)?.site?.name ?? '—') : 'No active unit' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Monthly rate
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeContract
                  ? formatAmount(
                    activeContract.items?.find(i => i.item_type === 'unit')?.amount,
                    activeContract.items?.find(i => i.item_type === 'unit')?.currency ?? activeContract.currency
                  )
                  : '—' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeContract ? ((activeContract.items?.find(i => i.item_type === 'unit')?.item as { unit_class?: { label?: string } } | null | undefined)?.unit_class?.label ?? '') : 'No active contract' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Tenancy start
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ activeContract?.start_date ?? '—' }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ activeContract ? 'Active contract' : 'No active contract' }}
              </p>
            </div>
          </UCard>
          <UCard>
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
                Open deals
              </p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ contact.deals?.filter(d => !['closed_won','closed_lost'].includes(d.status)).length ?? 0 }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ contact.deals?.length ?? 0 }} total deals
              </p>
            </div>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <!-- Left column -->
          <div class="flex flex-col gap-4 xl:col-span-2">
            <EntityOverviewCards
              entity-type="contact"
              :entity="contact"
              @native-saved="onNativeSaved"
            />

            <!-- Active contract details -->
            <UCard v-if="activeContract">
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Rented unit
                </h2>
              </template>
              <div class="flex items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated">
                  <UIcon
                    name="i-lucide-box"
                    class="size-5 text-dimmed"
                  />
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">
                    {{ (activeContract.items?.find(i => i.item_type === 'unit')?.item as { unit_number?: string } | null | undefined)?.unit_number }}
                  </p>
                  <p class="text-sm text-dimmed">
                    {{ (activeContract.items?.find(i => i.item_type === 'unit')?.item as { unit_class?: { label?: string } } | null | undefined)?.unit_class?.label }}
                  </p>
                  <p class="text-sm text-dimmed">
                    {{ (activeContract.items?.find(i => i.item_type === 'unit')?.item as { site?: { name?: string } } | null | undefined)?.site?.name }}
                  </p>
                </div>
              </div>
              <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-default pt-4 text-sm">
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Monthly rate
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ formatAmount(
                      activeContract.items?.find(i => i.item_type === 'unit')?.amount,
                      activeContract.items?.find(i => i.item_type === 'unit')?.currency ?? activeContract.currency
                    ) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Insurance
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ activeContract.items?.find(i => i.item_type === 'insurance')?.amount
                      ? formatAmount(
                        activeContract.items?.find(i => i.item_type === 'insurance')?.amount,
                        activeContract.items?.find(i => i.item_type === 'insurance')?.currency ?? activeContract.currency
                      )
                      : '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Start date
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ activeContract.start_date }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Status
                  </dt>
                  <dd class="mt-1">
                    <UBadge
                      :label="$t(`contracts.status.${activeContract.status}`)"
                      :color="contractStatusColor(activeContract.status)"
                      variant="subtle"
                      size="sm"
                    />
                  </dd>
                </div>
              </dl>
              <template #footer>
                <NuxtLink :to="`/leasing/contracts/${activeContract.id}`">
                  <UButton
                    :label="$t('pages.contracts.viewContract')"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>

            <!-- Recent activity: tasks + notes -->
            <UCard :ui="activityCardUi">
              <template #header>
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click="activityOpen = !activityOpen"
                >
                  <h2 class="text-sm font-medium text-dimmed">
                    Recent activity
                  </h2>
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-4 text-dimmed transition-transform duration-200"
                    :class="{ 'rotate-180': !activityOpen }"
                  />
                </button>
              </template>
              <div
                class="grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
                :class="activityOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
              >
                <div class="overflow-hidden min-h-0">
                  <div
                    v-if="!contact.tasks?.length && !contact.notes?.length"
                    class="py-6 text-center text-sm text-dimmed"
                  >
                    No activity yet.
                  </div>
                  <ul
                    v-else
                    class="divide-y divide-default"
                  >
                  <li
                    v-for="task in contact.tasks?.slice(0, 5)"
                    :key="`task-${task.id}`"
                    class="flex gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
                      <UIcon
                        name="i-lucide-check-circle"
                        class="size-4 text-dimmed"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-3">
                        <p class="text-sm font-medium text-highlighted">
                          {{ task.title }}
                        </p>
                        <span class="shrink-0 text-xs text-dimmed">
                          {{ task.due_date ?? task.created_at }}
                        </span>
                      </div>
                      <p
                        v-if="task.description"
                        class="mt-1 text-sm text-dimmed"
                      >
                        {{ task.description }}
                      </p>
                    </div>
                  </li>
                  <li
                    v-for="note in contact.notes?.slice(0, 3)"
                    :key="`note-${note.id}`"
                    class="flex gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated">
                      <UIcon
                        name="i-lucide-sticky-note"
                        class="size-4 text-dimmed"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-highlighted">
                        Note
                      </p>
                      <p class="mt-1 text-sm text-dimmed">
                        {{ note.content }}
                      </p>
                      <span class="text-xs text-dimmed">
                        {{ note.created_at }}
                      </span>
                    </div>
                  </li>
                </ul>
                </div>
              </div>
            </UCard>

            <ContactNotesCard
              v-if="contact"
              :contact-id="contact.id"
              :notes="contact.notes"
              @added="addNote"
            />
          </div>

          <!-- Right column sidebar -->
          <div class="flex flex-col gap-4">
            <!-- Open deal card -->
            <UCard v-if="openDeal">
              <template #header>
                <div class="flex items-start justify-between gap-3">
                  <h2 class="text-sm font-medium text-dimmed">
                    Open deal
                  </h2>
                  <UBadge
                    :label="$t(`dealStatus.${openDeal.status}`)"
                    :color="dealStatusColor(openDeal.status)"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </template>
              <div>
                <p class="font-semibold text-highlighted">
                  {{ openDeal.desired_unit_class?.label ?? `Deal #${openDeal.id}` }}
                </p>
                <p class="mt-1 text-sm text-dimmed">
                  {{ openDeal.expected_move_in ? `Move-in: ${openDeal.expected_move_in}` : 'No move-in date set' }}
                </p>
              </div>
              <template #footer>
                <div class="flex gap-2">
                  <UButton
                    label="View deal"
                    color="primary"
                    variant="soft"
                    class="flex-1"
                    :to="`/leasing/deals/${openDeal.id}`"
                  />
                </div>
              </template>
            </UCard>

            <ContactUpcomingTasksCard
              :contact-id="contact.id"
              :tasks="pendingTasks"
              @added="addTask"
              @status-updated="updateTask"
            />

            <ContactChannelsCard
              :contact-id="contact.id"
              :channels="contact.channels"
              @added="addChannel"
              @updated="updateChannel"
              @removed="removeChannel"
            />

            <ContactAddressesCard
              :contact-id="contact.id"
              :addresses="contact.addresses"
              @added="addAddress"
              @updated="updateAddress"
              @removed="removeAddress"
            />

            <ContactFiscalCard
              :contact="contact"
              @saved="mergeContact"
            />

            <ContactPaymentMethodsCard
              :contact-id="contact.id"
              :contracts="contact.contracts ?? []"
            />
          </div>
        </div>
      </template>

      <!-- Deals tab -->
      <template v-if="activeTab === 'deals'">
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ contact.deals?.length ?? 0 }} deal{{ (contact.deals?.length ?? 0) !== 1 ? 's' : '' }}
          </p>
          <UButton
            icon="i-lucide-plus"
            label="New deal"
            color="primary"
            size="sm"
            @click="showDealForm = true"
          />
        </div>
        <div
          v-if="!contact.deals?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No deals yet. Create the first one.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <NuxtLink
            v-for="deal in contact.deals"
            :key="deal.id"
            :to="`/leasing/deals/${deal.id}`"
            class="block"
          >
            <UCard class="cursor-pointer transition-colors hover:bg-elevated/50">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ deal.desired_unit_class?.label ?? `Deal #${deal.id}` }}
                  </p>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ deal.expected_move_in ? `Move-in ${deal.expected_move_in}` : 'No move-in date' }}
                    <template v-if="deal.offers?.length">
                      · {{ deal.offers.length }} offer{{ deal.offers.length !== 1 ? 's' : '' }}
                    </template>
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="$t(`dealStatus.${deal.status}`)"
                    :color="dealStatusColor(deal.status)"
                    variant="subtle"
                    size="sm"
                  />
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 text-dimmed"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </template>

      <!-- Reservations tab -->
      <template v-if="activeTab === 'reservations'">
        <div
          v-if="!contact.reservations?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No reservations yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <NuxtLink
            v-for="res in contact.reservations"
            :key="res.id"
            :to="`/operations/reservations/${res.id}`"
            class="block"
          >
            <UCard class="cursor-pointer transition-colors hover:bg-elevated/50">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    Unit {{ res.unit?.unit_number ?? `#${res.unit_id}` }}
                  </p>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ res.unit?.site?.name }}
                    · Expires {{ res.expires_at }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="$t(`reservationStatus.${res.status}`)"
                    :color="reservationStatusColor(res.status)"
                    variant="subtle"
                    size="sm"
                  />
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 text-dimmed"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </template>

      <!-- Contracts tab -->
      <template v-if="activeTab === 'contracts'">
        <div
          v-if="!contact.contracts?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No contracts yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <NuxtLink
            v-for="contract in contact.contracts"
            :key="contract.id"
            :to="`/leasing/contracts/${contract.id}`"
            class="block"
          >
            <UCard class="cursor-pointer transition-colors hover:bg-elevated/50">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    Unit {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { unit_number?: string } | null | undefined)?.unit_number ?? `#${contract.id}` }}
                    · {{ formatAmount(
                      contract.items?.find(i => i.item_type === 'unit')?.amount,
                      contract.items?.find(i => i.item_type === 'unit')?.currency ?? contract.currency
                    ) }}/mo
                  </p>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { site?: { name?: string } } | null | undefined)?.site?.name }}
                    · From {{ contract.start_date }}{{ contract.end_date ? ` to ${contract.end_date}` : '' }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="$t(`contracts.status.${contract.status}`)"
                    :color="contractStatusColor(contract.status)"
                    variant="subtle"
                    size="sm"
                  />
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 text-dimmed"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </template>

      <!-- Billing periods tab -->
      <template v-if="activeTab === 'billing_periods'">
        <div
          v-if="transactionsPending"
          class="flex min-h-40 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>
        <div
          v-else-if="transactionsError"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.loadError') }}
          </p>
        </div>
        <div
          v-else-if="!billingPeriods.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noBillingPeriods') }}
          </p>
        </div>
        <UTable
          v-else
          :data="billingPeriods"
          :columns="billingPeriodColumns"
          class="w-full"
        />
      </template>

      <!-- Invoices tab -->
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
          v-else-if="!contactInvoices.length"
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
            v-for="invoice in contactInvoices"
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

      <!-- Payments tab -->
      <template v-if="activeTab === 'payments'">
        <div
          v-if="transactionsPending"
          class="flex min-h-40 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>
        <div
          v-else-if="transactionsError"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.loadError') }}
          </p>
        </div>
        <div
          v-else-if="!payments.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noPayments') }}
          </p>
        </div>
        <UTable
          v-else
          :data="payments"
          :columns="paymentColumns"
          class="w-full"
        />
      </template>

      <!-- Activity tab -->
      <template v-if="activeTab === 'activity'">
        <div class="flex flex-col gap-6">
          <UCard>
            <template #header>
              <h3 class="font-medium text-highlighted">
                {{ $t('pages.contacts.interactions.title') }}
              </h3>
            </template>

            <form
              class="mb-4 grid gap-3 sm:grid-cols-2"
              @submit.prevent="onLogInteraction"
            >
              <UFormField :label="$t('pages.contacts.interactions.channel')">
                <USelect
                  v-model="interactionChannel"
                  :items="interactionChannelOptions"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="$t('pages.contacts.interactions.direction')">
                <USelect
                  v-model="interactionDirection"
                  :items="interactionDirectionOptions"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                class="sm:col-span-2"
                :label="$t('pages.contacts.interactions.summary')"
              >
                <UInput
                  v-model="interactionSummary"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                class="sm:col-span-2"
                :label="$t('pages.contacts.interactions.content')"
              >
                <UTextarea
                  v-model="interactionContent"
                  class="w-full"
                  :rows="3"
                />
              </UFormField>
              <div class="sm:col-span-2">
                <UButton
                  type="submit"
                  :loading="loggingInteraction"
                  :disabled="!isAuthenticated"
                >
                  {{ $t('pages.contacts.interactions.log') }}
                </UButton>
              </div>
            </form>

            <div
              v-if="interactionsPending"
              class="flex min-h-24 items-center justify-center"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-dimmed"
              />
            </div>
            <div
              v-else-if="interactionsError"
              class="rounded-lg border border-dashed border-default p-4 text-sm text-dimmed"
            >
              {{ $t('pages.contacts.interactions.loadError') }}
            </div>
            <div
              v-else-if="!interactions.length"
              class="rounded-lg border border-dashed border-default p-4 text-sm text-dimmed"
            >
              {{ $t('pages.contacts.interactions.empty') }}
            </div>
            <ul
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="item in interactions"
                :key="item.id"
                class="py-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">
                      {{ item.summary || item.channel }}
                    </p>
                    <p class="text-xs text-dimmed">
                      {{ item.channel }} · {{ item.direction }}
                    </p>
                    <p
                      v-if="item.content"
                      class="mt-1 text-sm text-muted"
                    >
                      {{ item.content }}
                    </p>
                  </div>
                  <span class="shrink-0 text-xs text-dimmed">
                    {{ item.occurred_at }}
                  </span>
                </div>
              </li>
            </ul>
          </UCard>

          <ActivityTimeline
            subject-type="contact"
            :subject-id="contact.id"
          />

          <div
            v-if="contact.tasks?.length || contact.notes?.length"
            class="flex flex-col gap-3"
          >
          <UCard
            v-for="task in contact.tasks"
            :key="`task-${task.id}`"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check-circle"
                class="mt-0.5 size-4 shrink-0 text-dimmed"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-highlighted">
                    {{ task.title }}
                  </p>
                  <span class="shrink-0 text-xs text-dimmed">
                    {{ task.created_at }}
                  </span>
                </div>
                <p
                  v-if="task.description"
                  class="mt-1 text-sm text-dimmed"
                >
                  {{ task.description }}
                </p>
              </div>
            </div>
          </UCard>
          <UCard
            v-for="note in contact.notes"
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
                    Note
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

      <!-- Files tab (deferred) -->
      <div
        v-if="activeTab === 'files'"
        class="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
      >
        <p class="text-sm text-dimmed">
          Files coming soon.
        </p>
      </div>
    </div>

    <!-- New deal form (pre-fills contact_id) -->
    <LeasingDealFormSlideover
      v-model:open="showDealForm"
      :initial-contact-id="contact?.id"
      :initial-contact-name="fullName"
      @saved="onDealSaved"
    />
  </UContainer>
</template>
