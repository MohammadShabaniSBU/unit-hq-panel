<script setup lang="ts">
import { reservationStatusColor } from '~/composables/useReservationsList'
import type { ApiReservation } from '~/types/reservation'

type ReservationTab = 'overview' | 'activity'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { formatDateTime } = useOrgDateFormat()

const reservationId = computed(() => String(route.params.id))
const activeTab = ref<ReservationTab>('overview')
const showConvertForm = ref(false)

const {
  reservation,
  pending,
  error,
  refresh,
  addNote
} = useReservationDetail(reservationId.value)

const contactName = computed(() => reservation.value?.contact?.name ?? `Contact #${reservation.value?.contact_id}`)

const unitLabel = computed(() => {
  const unit = reservation.value?.unit
  if (!unit) return reservation.value?.unit_id ? String(reservation.value.unit_id) : ''
  return unit.unit_class ? `${unit.unit_number} · ${unit.unit_class.label}` : unit.unit_number
})

const canConvert = computed(() =>
  !!reservation.value
  && !reservation.value.contract
  && reservation.value.status !== 'cancelled'
  && reservation.value.status !== 'expired'
)

const tabs = computed<Array<{ key: ReservationTab; label: string; count?: number }>>(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity', count: reservation.value?.notes?.length }
])

function onNativeSaved(updated: Record<string, unknown>) {
  if (!reservation.value) {
    return
  }

  Object.assign(reservation.value, updated as ApiReservation)
}

function onContractSaved() {
  refresh()
  showConvertForm.value = false
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
      v-else-if="error || !reservation"
      class="rounded-xl border border-error/30 bg-error/5 p-6 text-center"
    >
      <p class="text-sm text-error">
        Failed to load reservation.
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
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <nav class="mb-3 flex items-center gap-1.5 text-sm text-dimmed">
            <NuxtLink
              to="/operations/reservations"
              class="hover:text-highlighted"
            >
              Reservations
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <NuxtLink
              v-if="reservation.deal_id"
              :to="`/leasing/deals/${reservation.deal_id}`"
              class="hover:text-highlighted"
            >
              Deal #{{ reservation.deal_id }}
            </NuxtLink>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
            <span class="text-highlighted">Reservation #{{ reservation.id }}</span>
          </nav>

          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-highlighted">
              Reservation #{{ reservation.id }}
            </h1>
            <UBadge
              :label="$t(`reservationStatus.${reservation.status}`)"
              :color="reservationStatusColor(reservation.status)"
              variant="subtle"
            />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dimmed">
            <NuxtLink
              :to="`/leasing/contacts/${reservation.contact_id}`"
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
              Unit {{ unitLabel }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <UIcon
                name="i-lucide-calendar"
                class="size-3.5"
              />
              Expires {{ formatDateTime(reservation.expires_at) }}
            </span>
          </div>
        </div>

        <UButton
          v-if="canConvert"
          icon="i-lucide-file-plus-2"
          label="Convert"
          color="primary"
          @click="showConvertForm = true"
        />
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
            <EntityOverviewCards
              entity-type="reservation"
              :entity="reservation"
              @native-saved="onNativeSaved"
            />

            <ReservationNotesCard
              v-if="reservation"
              :reservation-id="reservation.id"
              :notes="reservation.notes"
              @added="addNote"
            />
          </div>

          <div class="flex flex-col gap-4">
            <UCard>
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Contact
                </h2>
              </template>
              <NuxtLink
                :to="`/leasing/contacts/${reservation.contact_id}`"
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
                </div>
              </NuxtLink>
              <template #footer>
                <NuxtLink :to="`/leasing/contacts/${reservation.contact_id}`">
                  <UButton
                    label="View contact"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>

            <UCard v-if="reservation.deal_id">
              <template #header>
                <h2 class="text-sm font-medium text-dimmed">
                  Deal
                </h2>
              </template>
              <NuxtLink
                :to="`/leasing/deals/${reservation.deal_id}`"
                class="flex items-center justify-between hover:opacity-80"
              >
                <p class="font-medium text-highlighted">
                  Deal #{{ reservation.deal_id }}
                </p>
              </NuxtLink>
              <template #footer>
                <NuxtLink :to="`/leasing/deals/${reservation.deal_id}`">
                  <UButton
                    label="View deal"
                    color="neutral"
                    variant="link"
                    trailing-icon="i-lucide-arrow-right"
                  />
                </NuxtLink>
              </template>
            </UCard>
          </div>
        </div>
      </div>

      <template v-if="activeTab === 'activity'">
        <div
          v-if="!reservation.notes?.length"
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
            v-for="note in reservation.notes"
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
                    {{ formatDateTime(note.created_at) }}
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
    </div>

    <LeasingContractFormSlideover
      v-model:open="showConvertForm"
      :initial-deal-id="reservation?.deal_id ?? undefined"
      :initial-contact-id="reservation?.contact_id"
      :initial-contact-name="reservation?.contact?.name"
      :initial-reservation-id="reservation?.id"
      :initial-unit-id="reservation?.unit_id"
      :initial-unit-label="unitLabel"
      @saved="onContractSaved"
    />
  </UContainer>
</template>
