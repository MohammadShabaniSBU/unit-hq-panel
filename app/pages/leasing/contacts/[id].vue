<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { dealStatusColor } from '~/composables/useDealsList'
import { contractStatusColor } from '~/composables/useContractsList'
import { reservationStatusColor } from '~/composables/useReservationsList'
import { invoiceStatusColor } from '~/composables/useContactTransactions'
import { CONTACT_LIFECYCLE_STATUSES, CONTACT_SOURCES } from '~/types/contact'
import type { ApiInvoice } from '~/types/invoice'
import type { ApiPayment } from '~/types/payment'

type ContactTab = 'overview' | 'activity' | 'deals' | 'reservations' | 'contracts' | 'invoices' | 'payments' | 'files'

const route = useRoute()
const { t } = useI18n()
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
  invoices,
  payments,
  pending: transactionsPending,
  error: transactionsError,
  loaded: transactionsLoaded,
  ensureLoaded: ensureTransactionsLoaded
} = useContactTransactions(contactId)

const activeTab = ref<ContactTab>('overview')
const showDealForm = ref(false)
const activityOpen = ref(true)

watch([activeTab, contactId], ([tab]) => {
  if (tab === 'invoices' || tab === 'payments') {
    ensureTransactionsLoaded()
  }
})

const activityCardUi = computed(() => ({
  header: activityOpen.value ? undefined : 'px-4 py-3 sm:px-6',
  body: activityOpen.value ? undefined : 'p-0 min-h-0 overflow-hidden'
}))

const { updateField, updatingField, fieldErrors } = useContactUpdate(contactId)

const sourceOptions = computed(() =>
  CONTACT_SOURCES.map(value => ({
    label: t(`contactSource.${value}`),
    value
  }))
)

const lifecycleStatusOptions = computed(() =>
  CONTACT_LIFECYCLE_STATUSES.map(value => ({
    label: t(`status.contact.${value}`),
    value
  }))
)

async function onContactFieldSave(field: string, value: string | null) {
  const updated = await updateField(field, value)

  if (updated) {
    mergeContact(updated)
  }
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
    count: transactionsLoaded.value ? invoices.value.length : undefined
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

function formatAmount(amount: string | undefined) {
  if (!amount) return '—'
  return `£${amount}`
}

function contractUnitLabel(unitNumber: string | null | undefined, contractId: number) {
  return unitNumber
    ? t('pages.contacts.transactions.unitLabel', { unit: unitNumber })
    : t('pages.contacts.transactions.contractLabel', { id: contractId })
}

const invoiceColumns = computed<Array<TableColumn<ApiInvoice>>>(() => [
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
  }
])

const paymentColumns = computed<Array<TableColumn<ApiPayment>>>(() => [
  {
    id: 'amount',
    header: t('table.amount'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, formatAmount(row.original.amount))
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
                {{ activeContract ? `£${activeContract.items?.find(i => i.item_type === 'unit')?.rate ?? '—'}` : '—' }}
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
            <!-- Contact info -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  {{ $t('forms.contact.contactInfoSection') }}
                </h2>
              </template>

              <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                <h3 class="col-span-full text-xs font-semibold uppercase tracking-wide text-dimmed">
                  {{ $t('forms.contact.identitySection') }}
                </h3>
                <InlineField
                  :label="$t('forms.contact.firstName')"
                  :value="contact.first_name"
                  :loading="updatingField === 'first_name'"
                  :error="fieldErrors.first_name"
                  :nullable="false"
                  @save="onContactFieldSave('first_name', $event)"
                />
                <InlineField
                  :label="$t('forms.contact.lastName')"
                  :value="contact.last_name"
                  :loading="updatingField === 'last_name'"
                  :error="fieldErrors.last_name"
                  :nullable="false"
                  @save="onContactFieldSave('last_name', $event)"
                />
                <InlineField
                  :label="$t('forms.contact.email')"
                  :value="contact.email"
                  type="email"
                  :loading="updatingField === 'email'"
                  :error="fieldErrors.email"
                  @save="onContactFieldSave('email', $event)"
                />

                <h3 class="col-span-full text-xs font-semibold uppercase tracking-wide text-dimmed">
                  {{ $t('forms.contact.lifecycleSection') }}
                </h3>
                <InlineField
                  :label="$t('table.status')"
                  :value="contact.status"
                  :display-value="$t(`status.contact.${contact.status}`)"
                  type="select"
                  :options="lifecycleStatusOptions"
                  :loading="updatingField === 'status'"
                  :error="fieldErrors.status"
                  @save="onContactFieldSave('status', $event)"
                />
                <InlineField
                  :label="$t('forms.contact.source')"
                  :value="contact.source"
                  :display-value="contact.source ? $t(`contactSource.${contact.source}`) : undefined"
                  type="select"
                  :options="sourceOptions"
                  :placeholder="$t('forms.contact.source')"
                  :loading="updatingField === 'source'"
                  :error="fieldErrors.source"
                  @save="onContactFieldSave('source', $event)"
                />
                <InlineField
                  v-if="contact.source"
                  :label="$t('forms.contact.sourceDetail')"
                  :value="contact.source_detail"
                  :loading="updatingField === 'source_detail'"
                  :error="fieldErrors.source_detail"
                  @save="onContactFieldSave('source_detail', $event)"
                />
              </div>
            </UCard>

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
                    £{{ activeContract.items?.find(i => i.item_type === 'unit')?.rate ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs uppercase tracking-wide text-dimmed">
                    Insurance
                  </dt>
                  <dd class="mt-1 font-medium text-highlighted">
                    {{ activeContract.items?.find(i => i.item_type === 'insurance')?.rate ? `£${activeContract.items?.find(i => i.item_type === 'insurance')?.rate}` : '—' }}
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
                      :label="$t(`contractStatus.${activeContract.status}`)"
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
                    · £{{ contract.items?.find(i => i.item_type === 'unit')?.rate ?? '—' }}/mo
                  </p>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { site?: { name?: string } } | null | undefined)?.site?.name }}
                    · From {{ contract.start_date }}{{ contract.end_date ? ` to ${contract.end_date}` : '' }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="$t(`contractStatus.${contract.status}`)"
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

      <!-- Invoices tab -->
      <template v-if="activeTab === 'invoices'">
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
          v-else-if="!invoices.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.contacts.transactions.noInvoices') }}
          </p>
        </div>
        <UTable
          v-else
          :data="invoices"
          :columns="invoiceColumns"
          class="w-full"
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
