<script setup lang="ts">
import { dealStatusColor } from '~/composables/useDealsList'
import { offerStatusColor } from '~/composables/useOffersList'
import { reservationStatusColor } from '~/composables/useReservationsList'
import { contractStatusColor } from '~/composables/useContractsList'
import { DEAL_STATUSES, STAY_PERIODS, STORAGE_REASONS } from '~/types/deal'
import type { ApiReservation } from '~/types/reservation'

type DealTab = 'overview' | 'activity' | 'offers' | 'reservations' | 'contracts'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const dealId = computed(() => String(route.params.id))

const {
  deal,
  pending,
  error,
  refresh,
  mergeDeal,
  addNote
} = useDealDetail(dealId.value)

const { updateField, updatingField, fieldErrors } = useDealUpdate(dealId)
const { items: unitClassItems } = useOptions('/api/unit-classes/options')

const activeTab = ref<DealTab>('overview')
const dealOffersCardRef = ref<{ openForm: () => void } | null>(null)
const showReservationForm = ref(false)
const showContractForm = ref(false)
const convertingReservation = ref<ApiReservation | null>(null)
const showConvertForm = ref(false)

const contactId = computed(() => deal.value?.contact_id ?? undefined)
const contactName = computed(() => deal.value?.contact?.name ?? `Contact #${deal.value?.contact_id}`)

const statusOptions = computed(() =>
  DEAL_STATUSES.map(value => ({
    label: t(`dealStatus.${value}`),
    value
  }))
)

const stayPeriodOptions = computed(() =>
  STAY_PERIODS.map(value => ({
    label: t(`stayPeriod.${value}`),
    value
  }))
)

const storageReasonOptions = computed(() =>
  STORAGE_REASONS.map(value => ({
    label: t(`storageReason.${value}`),
    value
  }))
)

const unitClassOptions = computed(() =>
  unitClassItems.value.map(item => ({
    label: item.label,
    value: String(item.value)
  }))
)

const tabs = computed<Array<{ key: DealTab; label: string; count?: number }>>(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'offers', label: 'Offers', count: deal.value?.offers?.length },
  { key: 'reservations', label: 'Reservations', count: deal.value?.reservations?.length },
  { key: 'contracts', label: 'Contracts', count: deal.value?.contracts?.length }
])

async function onDealFieldSave(field: string, value: string | null) {
  const updated = await updateField(field, value)

  if (updated) {
    mergeDeal(updated)
  }
}

function openConvert(res: ApiReservation) {
  convertingReservation.value = res
  showConvertForm.value = true
}

async function convertReservation(res: ApiReservation) {
  openConvert(res)
}

function onOfferSaved() {
  refresh()
}

function onReservationSaved() {
  refresh()
  toast.add({ title: t('forms.reservation.createSuccessMessage'), color: 'success' })
}

function onContractSaved() {
  refresh()
  showConvertForm.value = false
  convertingReservation.value = null
  toast.add({ title: t('forms.contract.createSuccessMessage'), color: 'success' })
}
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
      v-else-if="error || !deal"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        Failed to load deal.
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
        <div class="min-w-0">
          <nav class="mb-3 flex items-center gap-1.5 text-sm text-dimmed">
            <NuxtLink
              to="/leasing/deals"
              class="hover:text-highlighted"
            >
              Deals
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <NuxtLink
              v-if="deal.contact_id"
              :to="`/leasing/contacts/${deal.contact_id}`"
              class="hover:text-highlighted"
            >
              {{ contactName }}
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <span class="text-highlighted">Deal #{{ deal.id }}</span>
          </nav>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-highlighted">
              {{ deal.desired_unit_class?.label ?? `Deal #${deal.id}` }}
            </h1>
            <UBadge
              :label="$t(`dealStatus.${deal.status}`)"
              :color="dealStatusColor(deal.status)"
              variant="subtle"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
            <NuxtLink
              :to="`/leasing/contacts/${deal.contact_id}`"
              class="inline-flex items-center gap-1.5 hover:text-highlighted"
            >
              <UIcon
                name="i-lucide-user"
                class="size-3.5"
              />
              {{ contactName }}
            </NuxtLink>
            <span
              v-if="deal.expected_move_in"
              class="inline-flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-calendar"
                class="size-3.5"
              />
              Move-in {{ deal.expected_move_in }}
            </span>
            <span
              v-if="deal.desired_unit_class"
              class="inline-flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-box"
                class="size-3.5"
              />
              {{ deal.desired_unit_class.label }}
            </span>
          </div>
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
      <div v-show="activeTab === 'overview'">
        <div class="grid gap-4 xl:grid-cols-3">
          <div class="flex flex-col gap-4 xl:col-span-2">
            <!-- Offers -->
            <DealOffersCard
              ref="dealOffersCardRef"
              :deal-id="deal.id"
              :contact-id="contactId"
              :offers="deal.offers"
              @saved="onOfferSaved"
            />

            <!-- Reservations -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-medium text-dimmed">
                    Reservations
                    <span
                      v-if="deal.reservations?.length"
                      class="ms-1 tabular-nums"
                    >
                      ({{ deal.reservations.length }})
                    </span>
                  </h2>
                  <UButton
                    icon="i-lucide-plus"
                    label="New reservation"
                    color="primary"
                    size="sm"
                    @click="showReservationForm = true"
                  />
                </div>
              </template>
              <div
                v-if="!deal.reservations?.length"
                class="py-6 text-center text-sm text-dimmed"
              >
                No reservations yet. Reservations are created when an offer option is accepted, or manually.
              </div>
              <ul
                v-else
                class="divide-y divide-default"
              >
                <li
                  v-for="res in deal.reservations"
                  :key="res.id"
                  class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div class="min-w-0">
                    <NuxtLink
                      :to="`/operations/reservations/${res.id}`"
                      class="font-medium text-highlighted hover:underline"
                    >
                      Unit {{ res.unit?.unit_number ?? `#${res.unit_id}` }}
                    </NuxtLink>
                    <p class="mt-1 text-xs text-dimmed">
                      {{ res.unit?.site?.name }}
                      · Expires {{ res.expires_at }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :label="$t(`reservationStatus.${res.status}`)"
                      :color="reservationStatusColor(res.status)"
                      variant="subtle"
                      size="sm"
                    />
                    <UButton
                      v-if="!res.contract && res.status !== 'cancelled' && res.status !== 'expired'"
                      label="Convert"
                      color="primary"
                      variant="soft"
                      size="xs"
                      @click="convertReservation(res)"
                    />
                  </div>
                </li>
              </ul>
            </UCard>

            <!-- Contracts -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-medium text-dimmed">
                    Contracts
                    <span
                      v-if="deal.contracts?.length"
                      class="ms-1 tabular-nums"
                    >
                      ({{ deal.contracts.length }})
                    </span>
                  </h2>
                  <UButton
                    icon="i-lucide-plus"
                    label="New contract"
                    color="primary"
                    size="sm"
                    @click="showContractForm = true"
                  />
                </div>
              </template>
              <div
                v-if="!deal.contracts?.length"
                class="py-6 text-center text-sm text-dimmed"
              >
                No contracts yet.
              </div>
              <ul
                v-else
                class="divide-y divide-default"
              >
                <li
                  v-for="contract in deal.contracts"
                  :key="contract.id"
                  class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">
                      Unit {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { unit_number?: string } | null | undefined)?.unit_number ?? `#${contract.id}` }}
                      · £{{ contract.items?.find(i => i.item_type === 'unit')?.rate ?? '—' }}/mo
                    </p>
                    <p class="mt-1 text-xs text-dimmed">
                      {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { site?: { name?: string } } | null | undefined)?.site?.name }}
                      · From {{ contract.start_date }}{{ contract.end_date ? ` to ${contract.end_date}` : '' }}
                    </p>
                  </div>
                  <UBadge
                    :label="$t(`contractStatus.${contract.status}`)"
                    :color="contractStatusColor(contract.status)"
                    variant="subtle"
                    size="sm"
                  />
                </li>
              </ul>
            </UCard>

            <DealNotesCard
              v-if="deal"
              :deal-id="deal.id"
              :notes="deal.notes"
              @added="addNote"
            />
          </div>

          <!-- Sidebar -->
          <div class="flex flex-col gap-4">
            <!-- Contact card -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Contact
                </h2>
              </template>
              <NuxtLink
                :to="`/leasing/contacts/${deal.contact_id}`"
                class="flex items-center gap-3 hover:opacity-80"
              >
                <UAvatar
                  :text="contactName.slice(0, 2).toUpperCase()"
                  size="md"
                  class="shrink-0 bg-elevated font-semibold text-highlighted"
                />
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    {{ contactName }}
                  </p>
                  <p
                    v-if="deal.contact?.email"
                    class="text-sm text-dimmed"
                  >
                    {{ deal.contact.email }}
                  </p>
                </div>
              </NuxtLink>
              <template #footer>
                <NuxtLink :to="`/leasing/contacts/${deal.contact_id}`">
                  <UButton
                    label="View contact"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>

            <!-- Deal details -->
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Deal details
                </h2>
              </template>

              <div class="grid grid-cols-2 gap-x-6 gap-y-5">
                <InlineField
                  :label="$t('forms.deal.status')"
                  :value="deal.status"
                  :display-value="$t(`dealStatus.${deal.status}`)"
                  type="select"
                  :options="statusOptions"
                  :loading="updatingField === 'status'"
                  :error="fieldErrors.status"
                  :nullable="false"
                  @save="onDealFieldSave('status', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.expectedMoveIn')"
                  :value="deal.expected_move_in"
                  type="date"
                  :loading="updatingField === 'expected_move_in'"
                  :error="fieldErrors.expected_move_in"
                  @save="onDealFieldSave('expected_move_in', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.expectedStayLength')"
                  :value="deal.expected_stay_length != null ? String(deal.expected_stay_length) : null"
                  :loading="updatingField === 'expected_stay_length'"
                  :error="fieldErrors.expected_stay_length"
                  @save="onDealFieldSave('expected_stay_length', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.expectedStayPeriod')"
                  :value="deal.expected_stay_period"
                  :display-value="deal.expected_stay_period ? $t(`stayPeriod.${deal.expected_stay_period}`) : undefined"
                  type="select"
                  :options="stayPeriodOptions"
                  :loading="updatingField === 'expected_stay_period'"
                  :error="fieldErrors.expected_stay_period"
                  @save="onDealFieldSave('expected_stay_period', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.storageReason')"
                  :value="deal.storage_reason"
                  :display-value="deal.storage_reason ? $t(`storageReason.${deal.storage_reason}`) : undefined"
                  type="select"
                  :options="storageReasonOptions"
                  :loading="updatingField === 'storage_reason'"
                  :error="fieldErrors.storage_reason"
                  @save="onDealFieldSave('storage_reason', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.desiredSize')"
                  :value="deal.desired_size"
                  :display-value="deal.desired_size ? `${deal.desired_size} m²` : undefined"
                  :loading="updatingField === 'desired_size'"
                  :error="fieldErrors.desired_size"
                  @save="onDealFieldSave('desired_size', $event)"
                />
                <InlineField
                  :label="$t('forms.deal.desiredUnitClass')"
                  :value="deal.desired_unit_class_id != null ? String(deal.desired_unit_class_id) : null"
                  :display-value="deal.desired_unit_class?.label"
                  type="select"
                  :options="unitClassOptions"
                  :loading="updatingField === 'desired_unit_class_id'"
                  :error="fieldErrors.desired_unit_class_id"
                  @save="onDealFieldSave('desired_unit_class_id', $event)"
                />
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <!-- Activity tab -->
      <template v-if="activeTab === 'activity'">
        <div
          v-if="!deal.tasks?.length && !deal.notes?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No activity yet.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <UCard
            v-for="task in deal.tasks"
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
            v-for="note in deal.notes"
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
      </template>

      <!-- Offers tab -->
      <template v-if="activeTab === 'offers'">
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ deal.offers?.length ?? 0 }} offer{{ (deal.offers?.length ?? 0) !== 1 ? 's' : '' }}
          </p>
          <UButton
            icon="i-lucide-plus"
            label="New offer"
            color="primary"
            size="sm"
            @click="dealOffersCardRef?.openForm()"
          />
        </div>
        <div
          v-if="!deal.offers?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No offers yet. Create the first one.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <UCard
            v-for="offer in deal.offers"
            :key="offer.id"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  Offer #{{ offer.id }}
                </p>
                <p class="mt-1 text-sm text-dimmed">
                  {{ offer.options?.length ?? 0 }} option{{ (offer.options?.length ?? 0) !== 1 ? 's' : '' }}
                  · Expires {{ offer.expires_at }}
                </p>
              </div>
              <UBadge
                :label="$t(`offerStatus.${offer.status}`)"
                :color="offerStatusColor(offer.status)"
                variant="subtle"
                size="sm"
              />
            </div>
          </UCard>
        </div>
      </template>

      <!-- Reservations tab -->
      <template v-if="activeTab === 'reservations'">
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ deal.reservations?.length ?? 0 }} reservation{{ (deal.reservations?.length ?? 0) !== 1 ? 's' : '' }}
          </p>
          <UButton
            icon="i-lucide-plus"
            label="New reservation"
            color="primary"
            size="sm"
            @click="showReservationForm = true"
          />
        </div>
        <div
          v-if="!deal.reservations?.length"
          class="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
        >
          <p class="text-sm text-dimmed">
            No reservations yet. Reservations are created when an offer option is accepted, or manually.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <NuxtLink
            v-for="res in deal.reservations"
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
                <div class="flex items-center gap-2">
                  <UBadge
                    :label="$t(`reservationStatus.${res.status}`)"
                    :color="reservationStatusColor(res.status)"
                    variant="subtle"
                    size="sm"
                  />
                  <UButton
                    v-if="!res.contract && res.status !== 'cancelled' && res.status !== 'expired'"
                    label="Convert"
                    color="primary"
                    variant="soft"
                    size="xs"
                    @click.prevent="convertReservation(res)"
                  />
                </div>
              </div>
            </UCard>
          </NuxtLink>
        </div>
      </template>

      <!-- Contracts tab -->
      <template v-if="activeTab === 'contracts'">
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ deal.contracts?.length ?? 0 }} contract{{ (deal.contracts?.length ?? 0) !== 1 ? 's' : '' }}
          </p>
          <UButton
            icon="i-lucide-plus"
            label="New contract"
            color="primary"
            size="sm"
            @click="showContractForm = true"
          />
        </div>
        <div
          v-if="!deal.contracts?.length"
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
          <UCard
            v-for="contract in deal.contracts"
            :key="contract.id"
          >
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
              <UBadge
                :label="$t(`contractStatus.${contract.status}`)"
                :color="contractStatusColor(contract.status)"
                variant="subtle"
                size="sm"
              />
            </div>
          </UCard>
        </div>
      </template>
    </div>

    <LeasingReservationFormSlideover
      v-model:open="showReservationForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      :initial-site-id="deal?.site_id"
      @saved="onReservationSaved"
    />

    <LeasingContractFormSlideover
      v-model:open="showContractForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      @saved="onContractSaved"
    />

    <LeasingContractFormSlideover
      v-model:open="showConvertForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      :initial-reservation-id="convertingReservation?.id"
      :initial-unit-id="convertingReservation?.unit_id"
      @saved="onContractSaved"
    />
  </UContainer>
</template>
