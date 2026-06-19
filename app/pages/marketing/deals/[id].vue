<script setup lang="ts">
import { offerStatusColor } from '~/composables/useOffersList'
import { reservationStatusColor } from '~/composables/useReservationsList'
import { contractStatusColor } from '~/composables/useContractsList'
import type { ApiReservation } from '~/types/reservation'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { patch } = useApi()

const dealId = computed(() => String(route.params.id))

const { deal, activeOffers, pendingTasks, pending, error, refresh } = useDealDetail(dealId.value)

const showOfferForm = ref(false)
const showReservationForm = ref(false)
const showContractForm = ref(false)
const convertingReservation = ref<ApiReservation | null>(null)
const showConvertForm = ref(false)

const contactId = computed(() => deal.value?.contact_id ?? undefined)
const contactName = computed(() => deal.value?.contact?.name ?? `Contact #${deal.value?.contact_id}`)

function openConvert(res: ApiReservation) {
  convertingReservation.value = res
  showConvertForm.value = true
}

async function convertReservation(res: ApiReservation) {
  openConvert(res)
}

function onOfferSaved() {
  refresh()
  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
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
          <!-- Breadcrumb -->
          <nav class="mb-3 flex items-center gap-1.5 text-sm text-dimmed">
            <NuxtLink
              to="/marketing/deals"
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
              :to="`/marketing/contacts/${deal.contact_id}`"
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
              :color="deal.status === 'closed_won' ? 'success' : deal.status === 'closed_lost' ? 'error' : 'neutral'"
              variant="subtle"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
            <NuxtLink
              :to="`/marketing/contacts/${deal.contact_id}`"
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

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-pencil"
            label="Edit deal"
            color="neutral"
            variant="outline"
          />
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid gap-4 xl:grid-cols-3">
        <!-- Main column -->
        <div class="flex flex-col gap-4 xl:col-span-2">
          <!-- Deal details -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-medium text-dimmed">
                Deal details
              </h2>
            </template>
            <dl class="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Status
                </dt>
                <dd class="mt-1">
                  <UBadge
                    :label="$t(`dealStatus.${deal.status}`)"
                    :color="deal.status === 'closed_won' ? 'success' : deal.status === 'closed_lost' ? 'error' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  />
                </dd>
              </div>
              <div v-if="deal.expected_move_in">
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Expected move-in
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.expected_move_in }}
                </dd>
              </div>
              <div v-if="deal.expected_stay_length">
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Expected stay
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.expected_stay_length }} {{ deal.expected_stay_period }}
                </dd>
              </div>
              <div v-if="deal.storage_reason">
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Reason
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ $t(`storageReason.${deal.storage_reason}`) }}
                </dd>
              </div>
              <div v-if="deal.desired_size">
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Desired size
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.desired_size }} m²
                </dd>
              </div>
              <div v-if="deal.desired_unit_class">
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Unit class
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.desired_unit_class.label }}
                </dd>
              </div>
            </dl>
            <div
              v-if="deal.intent_notes"
              class="mt-5 border-t border-default pt-4"
            >
              <p class="text-xs uppercase tracking-wide text-dimmed">
                Notes
              </p>
              <p class="mt-2 text-sm text-highlighted">
                {{ deal.intent_notes }}
              </p>
            </div>
          </UCard>

          <!-- Offers -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-medium text-dimmed">
                  Offers
                  <span
                    v-if="deal.offers?.length"
                    class="ml-1 text-xs text-dimmed"
                  >({{ deal.offers.length }})</span>
                </h2>
                <UButton
                  icon="i-lucide-plus"
                  label="New offer"
                  color="primary"
                  size="sm"
                  @click="showOfferForm = true"
                />
              </div>
            </template>
            <div
              v-if="!deal.offers?.length"
              class="py-6 text-center text-sm text-dimmed"
            >
              No offers yet. Create the first one.
            </div>
            <ul
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="offer in deal.offers"
                :key="offer.id"
                class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div class="min-w-0">
                  <p class="font-medium text-highlighted">
                    Offer #{{ offer.id }}
                  </p>
                  <p class="mt-1 text-xs text-dimmed">
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
              </li>
            </ul>
          </UCard>

          <!-- Reservations -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-medium text-dimmed">
                  Reservations
                  <span
                    v-if="deal.reservations?.length"
                    class="ml-1 text-xs text-dimmed"
                  >({{ deal.reservations.length }})</span>
                </h2>
                <UButton
                  icon="i-lucide-plus"
                  label="New reservation"
                  color="neutral"
                  variant="outline"
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
                  <p class="font-medium text-highlighted">
                    Unit {{ res.unit?.unit_number ?? `#${res.unit_id}` }}
                  </p>
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

          <!-- Activity/Comments -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-medium text-dimmed">
                Activity
              </h2>
            </template>
            <div
              v-if="!deal.tasks?.length && !deal.comments?.length"
              class="py-6 text-center text-sm text-dimmed"
            >
              No activity yet.
            </div>
            <ul
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="task in deal.tasks"
                :key="`t-${task.id}`"
                class="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="size-4 text-dimmed"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-highlighted">
                      {{ task.title }}
                    </p>
                    <span class="shrink-0 text-xs text-dimmed">{{ task.created_at }}</span>
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
                v-for="comment in deal.comments"
                :key="`c-${comment.id}`"
                class="flex gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
                  <UIcon
                    name="i-lucide-sticky-note"
                    class="size-4 text-dimmed"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-highlighted">
                      Note
                    </p>
                    <span class="shrink-0 text-xs text-dimmed">{{ comment.created_at }}</span>
                  </div>
                  <p class="mt-1 text-sm text-dimmed">
                    {{ comment.body }}
                  </p>
                </div>
              </li>
            </ul>
          </UCard>
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
              :to="`/marketing/contacts/${deal.contact_id}`"
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
              <NuxtLink :to="`/marketing/contacts/${deal.contact_id}`">
                <UButton
                  label="View contact"
                  color="neutral"
                  variant="link"
                  trailing-icon="i-lucide-arrow-right"
                />
              </NuxtLink>
            </template>
          </UCard>

          <!-- Contracts -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-medium text-dimmed">
                  Contracts
                  <span
                    v-if="deal.contracts?.length"
                    class="ml-1 text-xs text-dimmed"
                  >({{ deal.contracts.length }})</span>
                </h2>
                <UButton
                  icon="i-lucide-plus"
                  label="New"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  @click="showContractForm = true"
                />
              </div>
            </template>
            <div
              v-if="!deal.contracts?.length"
              class="py-4 text-center text-sm text-dimmed"
            >
              No contracts yet.
            </div>
            <ul
              v-else
              class="space-y-3"
            >
              <li
                v-for="contract in deal.contracts"
                :key="contract.id"
                class="rounded-lg border border-default p-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-highlighted">
                      Unit {{ (contract.items?.find(i => i.item_type === 'unit')?.item as { unit_number?: string } | null | undefined)?.unit_number ?? `#${contract.id}` }}
                    </p>
                    <p class="text-xs text-dimmed">
                      £{{ contract.items?.find(i => i.item_type === 'unit')?.rate }}/mo · From {{ contract.start_date }}
                    </p>
                  </div>
                  <UBadge
                    :label="$t(`contractStatus.${contract.status}`)"
                    :color="contractStatusColor(contract.status)"
                    variant="subtle"
                    size="xs"
                  />
                </div>
              </li>
            </ul>
          </UCard>

          <!-- Upcoming tasks -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-medium text-dimmed">
                Upcoming tasks
              </h2>
            </template>
            <div
              v-if="!pendingTasks.length"
              class="py-4 text-center text-sm text-dimmed"
            >
              No pending tasks.
            </div>
            <ul
              v-else
              class="space-y-3"
            >
              <li
                v-for="task in pendingTasks"
                :key="task.id"
                class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2.5"
              >
                <span class="text-sm font-medium text-highlighted">
                  {{ task.title }}
                </span>
                <span
                  class="text-xs font-medium"
                  :class="{
                    'text-error': task.priority === 'urgent' || task.priority === 'high',
                    'text-warning': task.priority === 'medium',
                    'text-dimmed': task.priority === 'low'
                  }"
                >
                  {{ task.due_date ?? '—' }}
                </span>
              </li>
            </ul>
          </UCard>

          <!-- Deal meta -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-medium text-dimmed">
                Timeline
              </h2>
            </template>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Created
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.created_at }}
                </dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-dimmed">
                  Last updated
                </dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ deal.updated_at }}
                </dd>
              </div>
            </dl>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Offer form slideover (pre-filled with deal_id and contact_id) -->
    <MarketingOfferFormSlideover
      v-model:open="showOfferForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      @saved="onOfferSaved"
    />

    <!-- Reservation form slideover -->
    <MarketingReservationFormSlideover
      v-model:open="showReservationForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      @saved="onReservationSaved"
    />

    <!-- New contract form (standalone) -->
    <MarketingContractFormSlideover
      v-model:open="showContractForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      @saved="onContractSaved"
    />

    <!-- Convert reservation → contract -->
    <MarketingContractFormSlideover
      v-model:open="showConvertForm"
      :initial-deal-id="deal?.id"
      :initial-contact-id="contactId"
      :initial-reservation-id="convertingReservation?.id"
      :initial-unit-id="convertingReservation?.unit_id"
      @saved="onContractSaved"
    />
  </UContainer>
</template>
