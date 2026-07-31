<script setup lang="ts">
import { CalendarDate, Time, getLocalTimeZone, today } from '@internationalized/date'
import type { ApiUnitClassSitePrice, ApiUnit } from '~/types/facility'
import type { ApiOffer, ApiOfferOption, OfferStatus } from '~/types/offer'
import type { ApiReservation } from '~/types/reservation'
import type { ApiContract } from '~/types/contract'
import type { ApiLeasingSettings } from '~/types/settings'
import type { ApiDeal } from '~/types/deal'
import { formatUnitClass, formatUnitDimensions } from '~/composables/useUnitsList'
import { formatUnitMapPrice } from '~/composables/useUnitsMapView'
import { formatCurrencyAmount } from '~/composables/useUnitClassPriceMatrix'
import { useReservationForm } from '~/composables/useReservationForm'
import { useContactForm } from '~/composables/useContactForm'
import { UNIT_STATES } from '~/types/unit'
import { unitStateLegendSwatches } from '~/composables/useUnitState'

type MapMode = 'normal' | 'offer'
type ContactTab = 'select' | 'create'

const { t } = useI18n()
const toast = useToast()
const { get, getPaginated, post } = useApi()

// ─── Shared state ────────────────────────────────────────────────────────────
const selectedSiteId = ref<number | undefined>(undefined)
const mode = ref<MapMode>('normal')

const {
  maps,
  unitsByNumber,
  priceByUnitClassId,
  pending: mapPending,
  error: mapError,
  refresh: refreshMap,
  getHoverDetails,
  emptyValue
} = useUnitsMapView(selectedSiteId)

const { items: siteItems } = useOptions('/api/sites/options')

const leasingSettings = ref<ApiLeasingSettings | null>(null)

onMounted(async () => {
  try {
    const res = await get<ApiLeasingSettings>('/api/settings/leasing')
    leasingSettings.value = res.data
  } catch {
    // silent — defaults used when settings unavailable
  }
})

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatIsoDatetime(date: CalendarDate | null, time: Time | null): string {
  if (!date || !time) return ''
  const hours = String(time.hour).padStart(2, '0')
  const minutes = String(time.minute).padStart(2, '0')
  return `${formatIsoDate(date)}T${hours}:${minutes}`
}

function parseIsoDatetime(value: string): { date: CalendarDate | null, time: Time | null } {
  if (!value.trim()) return { date: null, time: null }

  const [datePart = '', timePart = ''] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  if (!year || !month || !day) return { date: null, time: null }

  const date = new CalendarDate(year, month, day)
  const time = Number.isFinite(hours) && Number.isFinite(minutes)
    ? new Time(hours, minutes)
    : null

  return { date, time }
}

function computeDefaultExpiresAt(): string {
  const settings = leasingSettings.value
  const value = settings?.default_reservation_expiration_value ?? 3
  const unit = settings?.default_reservation_expiration_unit ?? 'days'
  const d = new Date()

  if (unit === 'minutes') d.setMinutes(d.getMinutes() + value)
  else if (unit === 'hours') d.setHours(d.getHours() + value)
  else if (unit === 'days') d.setDate(d.getDate() + value)
  else if (unit === 'weeks') d.setDate(d.getDate() + value * 7)

  return formatDatetimeLocal(d)
}

// ─── Normal mode ─────────────────────────────────────────────────────────────
const clickedUnitNumber = ref<string | null>(null)
const clickedUnit = computed<ApiUnit | null>(() =>
  clickedUnitNumber.value ? (unitsByNumber.value.get(clickedUnitNumber.value) ?? null) : null
)
const clickedUnitPrice = computed(() =>
  clickedUnit.value ? priceByUnitClassId.value.get(clickedUnit.value.unit_class_id) : undefined
)

// Quick reservation form (normal mode, free units)
const {
  form: reservationForm,
  submitting: reservationSubmitting,
  error: reservationError,
  fieldErrors: reservationFieldErrors,
  reset: resetReservationForm,
  submit: submitReservation
} = useReservationForm()

const contactTabNormal = ref<ContactTab>('select')

const contactTabItems = computed(() => [
  { label: t('pages.unitMap.contactTabSelect'), value: 'select' },
  { label: t('pages.unitMap.contactTabCreate'), value: 'create' }
])
const contactSearchNormal = ref('')
const { items: contactItemsNormal, pending: contactPendingNormal } = useSearchOptions(
  '/api/contacts/options',
  contactSearchNormal
)
const {
  form: contactFormNormal,
  submitting: contactFormNormalSubmitting,
  error: contactFormNormalError,
  fieldErrors: contactFormNormalFieldErrors,
  reset: resetContactFormNormal,
  submit: submitContactNormal
} = useContactForm()

const contactSelectItemsNormal = computed(() => {
  if (!reservationForm.contact_id) return contactItemsNormal.value
  const has = contactItemsNormal.value.some(i => i.value === reservationForm.contact_id)
  return has ? contactItemsNormal.value : contactItemsNormal.value
})

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const minDate = today(getLocalTimeZone())

const reservationExpiresDate = shallowRef<CalendarDate | null>(null)
const reservationExpiresTime = shallowRef<Time | null>(null)
const reservationExpiresAtInput = useTemplateRef('reservationExpiresAtInput')

watch([reservationExpiresDate, reservationExpiresTime], ([date, time]) => {
  reservationForm.expires_at = formatIsoDatetime(
    date as CalendarDate | null,
    time as Time | null
  )
})

function clearReservationExpiresAt() {
  reservationExpiresDate.value = null
  reservationExpiresTime.value = null
}

function setReservationExpiresAt(value: string) {
  const parsed = parseIsoDatetime(value)
  reservationExpiresDate.value = parsed.date
  reservationExpiresTime.value = parsed.time
}

function onNormalContactSelect(id: number | null | undefined) {
  reservationForm.contact_id = id ?? null
}

function reservationFieldError(name: string) {
  return reservationFieldErrors.value[name]?.[0]
}

function contactFormNormalFieldError(name: string) {
  return contactFormNormalFieldErrors.value[name]?.[0]
}

async function resolveNormalContactId(): Promise<number | null> {
  if (contactTabNormal.value === 'select') {
    return reservationForm.contact_id
  }

  const contact = await submitContactNormal()
  if (!contact) return null

  reservationForm.contact_id = contact.id
  return contact.id
}

async function onReserveUnit() {
  if (!clickedUnit.value || !selectedSiteId.value) return

  const contactId = await resolveNormalContactId()
  if (!contactId) return

  const dealId = await resolveDealId(contactId, selectedSiteId.value)
  if (!dealId) {
    toast.add({ title: t('pages.unitMap.createReservationError'), color: 'error' })
    return
  }

  reservationForm.site_id = selectedSiteId.value
  reservationForm.unit_id = clickedUnit.value.id
  reservationForm.unit_class_id = clickedUnit.value.unit_class_id
  reservationForm.contact_id = contactId
  reservationForm.deal_id = dealId

  const result = await submitReservation()
  if (!result) return

  toast.add({ title: t('pages.unitMap.createReservationSuccess'), color: 'success' })
  clickedUnitNumber.value = null
  resetReservationForm()
  clearReservationExpiresAt()
  resetContactFormNormal()
  contactTabNormal.value = 'select'
  contactSearchNormal.value = ''
  await refreshMap()
}

// ─── Occupancy info (reserved / occupied units) ───────────────────────────────
const occupancyLoading = ref(false)
const activeReservation = ref<ApiReservation | null>(null)
const activeContract = ref<ApiContract | null>(null)

async function fetchOccupancyInfo(unit: ApiUnit) {
  activeReservation.value = null
  activeContract.value = null

  if (unit.state === 'reserved') {
    occupancyLoading.value = true
    try {
      const res = await getPaginated<ApiReservation>('/api/reservations', {
        unit_id: unit.id,
        per_page: 1
      })
      activeReservation.value = res.data[0] ?? null
    } catch {
      // silent
    } finally {
      occupancyLoading.value = false
    }
  } else if (unit.state === 'occupied') {
    occupancyLoading.value = true
    try {
      const res = await getPaginated<ApiContract>('/api/contracts', {
        unit_id: unit.id,
        status: 'active',
        per_page: 1
      })
      activeContract.value = res.data[0] ?? null
    } catch {
      // silent
    } finally {
      occupancyLoading.value = false
    }
  }
}

// When a unit is clicked in normal mode, pre-fill the reservation form
watch(clickedUnit, (unit) => {
  resetReservationForm()
  resetContactFormNormal()
  contactTabNormal.value = 'select'
  contactSearchNormal.value = ''
  clearReservationExpiresAt()
  activeReservation.value = null
  activeContract.value = null

  if (!unit) return

  if (unit.state === 'available' && selectedSiteId.value) {
    reservationForm.site_id = selectedSiteId.value
    reservationForm.unit_id = unit.id
    reservationForm.unit_class_id = unit.unit_class_id
    setReservationExpiresAt(computeDefaultExpiresAt())
  } else if (unit.state === 'reserved' || unit.state === 'occupied') {
    fetchOccupancyInfo(unit)
  }
})

// ─── Offer mode ───────────────────────────────────────────────────────────────
const selectedUnitNumbers = ref<Set<string>>(new Set())
const selectedUnits = computed<Array<ApiUnit>>(() =>
  Array.from(selectedUnitNumbers.value)
    .map(n => unitsByNumber.value.get(n))
    .filter((u): u is ApiUnit => !!u)
)

// Offer form fields
const contactTabOffer = ref<ContactTab>('select')
const offerContactId = ref<number | null>(null)
const offerContactSearch = ref('')
const {
  form: contactFormOffer,
  submitting: contactFormOfferSubmitting,
  error: contactFormOfferError,
  fieldErrors: contactFormOfferFieldErrors,
  reset: resetContactFormOffer,
  submit: submitContactOffer
} = useContactForm()
const offerMoveInDate = shallowRef<CalendarDate | null>(null)
const offerExpiresDate = shallowRef<CalendarDate | null>(null)
const offerExpiresTime = shallowRef<Time | null>(null)
const offerExpiresAtString = ref<string>('')
const offerExpiresAtInput = useTemplateRef('offerExpiresAtInput')
const offerStorageReason = ref<string | undefined>(undefined)

watch([offerExpiresDate, offerExpiresTime], ([date, time]) => {
  offerExpiresAtString.value = formatIsoDatetime(
    date as CalendarDate | null,
    time as Time | null
  )
})

function computeDefaultOfferExpiresAt(): string {
  const settings = leasingSettings.value
  const value = settings?.default_offer_expiration_value ?? 7
  const unit = settings?.default_offer_expiration_unit ?? 'days'
  const d = new Date()

  if (unit === 'minutes') d.setMinutes(d.getMinutes() + value)
  else if (unit === 'hours') d.setHours(d.getHours() + value)
  else if (unit === 'days') d.setDate(d.getDate() + value)
  else if (unit === 'weeks') d.setDate(d.getDate() + value * 7)

  return formatDatetimeLocal(d)
}

function setOfferExpiresAt(value: string) {
  const parsed = parseIsoDatetime(value)
  offerExpiresDate.value = parsed.date
  offerExpiresTime.value = parsed.time
}

function clearOfferExpiresAt() {
  offerExpiresDate.value = null
  offerExpiresTime.value = null
  offerExpiresAtString.value = ''
}
const offerStatus = ref<OfferStatus>('draft')
const offerSubmitting = ref(false)
const createdOffer = ref<ApiOffer | null>(null)
const capturedMoveInDate = shallowRef<CalendarDate | null>(null)
const sendChannel = ref<'whatsapp' | 'email' | undefined>(undefined)

const requestURL = useRequestURL()

const offerShareUrl = computed(() =>
  createdOffer.value
    ? `${requestURL.origin}/preview/offer/${createdOffer.value.token}`
    : ''
)

const createdOfferOptions = computed(() =>
  [...(createdOffer.value?.options ?? [])].sort((a, b) => a.display_order - b.display_order)
)

const sendChannelOptions = computed(() => [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: t('common.email') }
])

function formatOfferOptionPrice(option: ApiOfferOption): string {
  const price = option.unit_class_rate?.price
  if (!price) return emptyValue.value
  return formatCurrencyAmount(price.amount, price.currency)
}

function copyOfferLink() {
  if (!offerShareUrl.value) return
  navigator.clipboard.writeText(offerShareUrl.value)
  toast.add({ title: t('pages.unitMap.offerLinkCopied'), color: 'success' })
}

function onSendOffer() {
  // no-op for now
}

const { items: contactItemsOffer, pending: contactPendingOffer } = useSearchOptions(
  '/api/contacts/options',
  offerContactSearch
)

const offerStatusOptions = [
  { value: 'draft', label: t('status.offer.draft', 'Draft') },
  { value: 'sent', label: t('status.offer.sent', 'Sent') }
] as Array<{ value: OfferStatus, label: string }>

const storageReasonOptions = computed(() =>
  Object.entries(t('storageReason', {}) as unknown as Record<string, string>).map(([value, label]) => ({
    value,
    label
  }))
)

function resetOfferFormState() {
  offerContactId.value = null
  offerContactSearch.value = ''
  contactTabOffer.value = 'select'
  resetContactFormOffer()
  offerMoveInDate.value = null
  clearOfferExpiresAt()
  offerStorageReason.value = undefined
  offerStatus.value = 'draft'
}

function clearOfferSelection() {
  selectedUnitNumbers.value = new Set()
  resetOfferFormState()
  createdOffer.value = null
  capturedMoveInDate.value = null
  sendChannel.value = undefined
}

function contactFormOfferFieldError(name: string) {
  return contactFormOfferFieldErrors.value[name]?.[0]
}

async function resolveOfferContactId(): Promise<number | null> {
  if (contactTabOffer.value === 'select') {
    return offerContactId.value
  }

  const contact = await submitContactOffer()
  if (!contact) return null

  offerContactId.value = contact.id
  return contact.id
}

// Cache of unit_class_rate_id by unit_class_id (for the current site)
const rateIdCache = ref<Map<number, number | null>>(new Map())

async function resolveRateId(unitClassId: number, siteId: number): Promise<number | null> {
  if (rateIdCache.value.has(unitClassId)) {
    return rateIdCache.value.get(unitClassId) ?? null
  }

  try {
    const response = await get<Array<ApiUnitClassSitePrice>>(
      `/api/unit-classes/${unitClassId}/prices`
    )
    const sitePrice = response.data.find(p => p.site_id === siteId)
    const rateId = sitePrice?.unit_class_rate_id ?? null
    rateIdCache.value.set(unitClassId, rateId)
    return rateId
  } catch {
    return null
  }
}

const CLOSED_DEAL_STATUSES = new Set(['closed_won', 'closed_lost'])

async function resolveDealId(contactId: number, siteId: number): Promise<number | null> {
  try {
    const res = await getPaginated<ApiDeal>('/api/deals', {
      contact_id: contactId,
      per_page: 50
    })
    const active = res.data.find(d => !CLOSED_DEAL_STATUSES.has(d.status))
    if (active) return active.id

    const created = await post<ApiDeal>('/api/deals', {
      contact_id: contactId,
      site_id: siteId
    })
    return created.data.id
  } catch {
    return null
  }
}

async function onCreateOffer() {
  if (!selectedUnits.value.length || !selectedSiteId.value || !offerExpiresAtString.value) return

  const contactId = await resolveOfferContactId()
  if (!contactId) return

  const siteId = selectedSiteId.value
  const dealId = await resolveDealId(contactId, siteId)
  if (!dealId) {
    toast.add({ title: t('pages.unitMap.createOfferError'), color: 'error' })
    return
  }

  offerSubmitting.value = true

  try {
    const options = await Promise.all(
      selectedUnits.value.map(async (unit, index) => {
        const rateId = await resolveRateId(unit.unit_class_id, siteId)
        return {
          unit_class_rate_id: rateId,
          unit_id: unit.id,
          label: `${unit.unit_number} — ${formatUnitClass(unit)}`,
          display_order: index
        }
      })
    )

    const validOptions = options.filter(o => o.unit_class_rate_id !== null)

    if (!validOptions.length) {
      toast.add({
        title: t('pages.unitMap.createOfferError'),
        description: 'No valid unit class rates found for the selected units.',
        color: 'error'
      })
      return
    }

    const payload: Record<string, unknown> = {
      deal_id: dealId,
      contact_id: contactId,
      expires_at: offerExpiresAtString.value,
      status: offerStatus.value,
      options: validOptions
    }

    if (offerMoveInDate.value) {
      payload.move_in_date = formatIsoDate(offerMoveInDate.value)
    }

    if (offerStorageReason.value !== undefined) {
      payload.storage_reason = offerStorageReason.value
    }

    const res = await post<ApiOffer>('/api/offers', payload)

    capturedMoveInDate.value = offerMoveInDate.value
    createdOffer.value = res.data
    selectedUnitNumbers.value = new Set()
    resetOfferFormState()
    await refreshMap()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: t('pages.unitMap.createOfferError'),
      description: fetchError.data?.message,
      color: 'error'
    })
  } finally {
    offerSubmitting.value = false
  }
}

// ─── Map interaction ───────────────────────────────────────────────────────────
function onUnitClick(unitNumber: string) {
  if (mode.value === 'normal') {
    clickedUnitNumber.value = clickedUnitNumber.value === unitNumber ? null : unitNumber
  } else {
    const next = new Set(selectedUnitNumbers.value)
    if (next.has(unitNumber)) {
      next.delete(unitNumber)
    } else {
      next.add(unitNumber)
    }
    selectedUnitNumbers.value = next
  }
}

function removeSelectedUnit(unitNumber: string) {
  const next = new Set(selectedUnitNumbers.value)
  next.delete(unitNumber)
  selectedUnitNumbers.value = next
}

// Reset map state when mode changes
watch(mode, (newMode) => {
  clickedUnitNumber.value = null
  selectedUnitNumbers.value = new Set()
  resetReservationForm()
  resetContactFormNormal()
  resetContactFormOffer()
  contactTabNormal.value = 'select'
  contactTabOffer.value = 'select'
  offerContactId.value = null
  offerContactSearch.value = ''
  createdOffer.value = null
  capturedMoveInDate.value = null
  sendChannel.value = undefined
  if (newMode === 'offer') {
    setOfferExpiresAt(computeDefaultOfferExpiresAt())
  } else {
    clearOfferExpiresAt()
  }
})

// Reset rate cache when site changes
watch(selectedSiteId, () => {
  rateIdCache.value = new Map()
  clickedUnitNumber.value = null
  selectedUnitNumbers.value = new Set()
})

// ─── Computed helpers ────────────────────────────────────────────────────────
const legendStates = UNIT_STATES
</script>

<template>
  <div class="flex h-[calc(100svh-4rem)] overflow-hidden">
    <!-- ── Left panel: toolbar + map ── -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 border-b border-default bg-default px-4 py-3">
        <!-- Site selector -->
        <USelect
          v-model="selectedSiteId"
          :items="siteItems"
          value-key="value"
          label-key="label"
          :placeholder="$t('pages.unitMap.selectSite')"
          class="w-48"
        />

        <!-- Mode toggle -->
        <div class="flex items-center rounded-lg border border-default p-0.5">
          <UButton
            :label="$t('pages.unitMap.modeNormal')"
            :color="mode === 'normal' ? 'primary' : 'neutral'"
            :variant="mode === 'normal' ? 'soft' : 'ghost'"
            size="sm"
            @click="mode = 'normal'"
          />
          <UButton
            :label="$t('pages.unitMap.modeOffer')"
            :color="mode === 'offer' ? 'primary' : 'neutral'"
            :variant="mode === 'offer' ? 'soft' : 'ghost'"
            size="sm"
            @click="mode = 'offer'"
          />
        </div>

        <!-- Legend -->
        <div class="ml-auto flex flex-wrap items-center gap-3 text-xs text-dimmed">
          <span>{{ $t('pages.units.mapLegend') }}</span>
          <span
            v-for="state in legendStates"
            :key="state"
            class="inline-flex items-center gap-1.5"
          >
            <span
              class="size-2.5 rounded-sm"
              :class="unitStateLegendSwatches[state]"
            />
            {{ $t(`units.state.${state}`) }}
          </span>
        </div>
      </div>

      <!-- Map content -->
      <div class="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950">
        <!-- Loading -->
        <div
          v-if="mapPending"
          class="flex h-full items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-dimmed"
          />
        </div>

        <!-- Error -->
        <div
          v-else-if="mapError"
          class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <p class="text-sm text-error">
            {{ $t('pages.unitMap.loadError') }}
          </p>
          <UButton
            :label="$t('common.retry')"
            color="neutral"
            variant="outline"
            size="sm"
            @click="refreshMap()"
          />
        </div>

        <!-- No site selected -->
        <div
          v-else-if="!selectedSiteId"
          class="flex h-full items-center justify-center"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.unitMap.selectSitePrompt') }}
          </p>
        </div>

        <!-- No maps -->
        <div
          v-else-if="!maps.length"
          class="flex h-full items-center justify-center"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.unitMap.mapEmpty') }}
          </p>
        </div>

        <!-- Map -->
        <LeasingUnitMapInteractive
          v-else
          :site-id="selectedSiteId"
          :maps="maps"
          :units-by-number="unitsByNumber"
          :get-hover-details="getHoverDetails"
          :mode="mode"
          :selected-unit-numbers="selectedUnitNumbers"
          :clicked-unit-number="clickedUnitNumber"
          @unit-click="onUnitClick"
        />
      </div>
    </div>

    <!-- ── Right sidebar ── -->
    <aside class="flex w-[460px] shrink-0 flex-col overflow-hidden border-l border-default bg-default">
      <!-- ── Normal mode ── -->
      <template v-if="mode === 'normal'">
        <!-- No unit clicked -->
        <div
          v-if="!clickedUnit"
          class="flex flex-1 items-center justify-center p-8 text-center"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.unitMap.noUnitSelected') }}
          </p>
        </div>

        <!-- Unit detail -->
        <div
          v-else
          class="flex flex-1 flex-col overflow-y-auto"
        >
          <!-- Header -->
          <div class="border-b border-default px-5 py-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  {{ clickedUnit.unit_number }}
                </h2>
                <p class="mt-0.5 text-sm text-dimmed">
                  {{ formatUnitClass(clickedUnit) }}
                </p>
              </div>
              <FacilityUnitStateBadge
                :state="clickedUnit.state"
                class="mt-1 shrink-0"
              />
            </div>
          </div>

          <!-- Unit info -->
          <div class="border-b border-default px-5 py-4">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-dimmed">
                  {{ $t('table.dimensions') }}
                </dt>
                <dd class="text-right font-medium text-highlighted">
                  {{ formatUnitDimensions(clickedUnit) }}
                </dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-dimmed">
                  {{ $t('pages.units.mapCurrentPrice') }}
                </dt>
                <dd class="text-right font-medium text-highlighted">
                  {{ formatUnitMapPrice(clickedUnitPrice, t, emptyValue) }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Quick reservation (free units only) -->
          <template v-if="clickedUnit.state === 'available'">
            <div class="px-5 py-4">
              <h3 class="mb-4 text-sm font-medium text-highlighted">
                {{ $t('pages.unitMap.quickReservation') }}
              </h3>

              <form
                class="flex flex-col gap-3"
                @submit.prevent="onReserveUnit"
              >
                <UFormField
                  :label="$t('forms.reservation.contact')"
                  name="contact_id"
                  required
                  :error="contactTabNormal === 'select' ? reservationFieldError('contact_id') : undefined"
                >
                  <div class="flex flex-col gap-3">
                    <UTabs
                      v-model="contactTabNormal"
                      :items="contactTabItems"
                      :content="false"
                      value-key="value"
                      size="xs"
                    />

                    <USelectMenu
                      v-if="contactTabNormal === 'select'"
                      v-model:search-term="contactSearchNormal"
                      :model-value="reservationForm.contact_id ?? undefined"
                      :items="contactSelectItemsNormal"
                      value-key="value"
                      ignore-filter
                      :loading="contactPendingNormal"
                      :placeholder="$t('forms.reservation.contact')"
                      class="w-full"
                      @update:model-value="onNormalContactSelect"
                    />

                    <div
                      v-else
                      class="flex flex-col gap-3"
                    >
                      <UFormField
                        :label="$t('forms.contact.firstName')"
                        name="first_name"
                        required
                        :error="contactFormNormalFieldError('first_name')"
                      >
                        <UInput
                          v-model="contactFormNormal.first_name"
                          class="w-full"
                        />
                      </UFormField>

                      <UFormField
                        :label="$t('forms.contact.lastName')"
                        name="last_name"
                        required
                        :error="contactFormNormalFieldError('last_name')"
                      >
                        <UInput
                          v-model="contactFormNormal.last_name"
                          class="w-full"
                        />
                      </UFormField>

                      <UFormField
                        :label="$t('forms.contact.email')"
                        name="email"
                        :error="contactFormNormalFieldError('email')"
                      >
                        <UInput
                          v-model="contactFormNormal.email"
                          type="email"
                          class="w-full"
                        />
                      </UFormField>

                      <div
                        v-if="contactFormNormalError && !Object.keys(contactFormNormalFieldErrors).length"
                        class="rounded-lg border border-error/30 bg-error/5 p-3"
                      >
                        <p class="text-xs text-error">
                          {{ contactFormNormalError }}
                        </p>
                      </div>
                    </div>
                  </div>
                </UFormField>

                <USeparator />

                <UFormField
                  :label="$t('forms.reservation.expiresAt')"
                  name="expires_at"
                  required
                  :error="reservationFieldError('expires_at')"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <UInputDate
                      ref="reservationExpiresAtInput"
                      v-model="reservationExpiresDate"
                      :min-value="minDate"
                      class="w-full flex-1"
                    >
                      <template #trailing>
                        <UPopover :reference="reservationExpiresAtInput?.inputsRef[3]?.$el">
                          <UButton
                            color="neutral"
                            variant="link"
                            size="sm"
                            icon="i-lucide-calendar"
                            class="px-0"
                          />
                          <template #content>
                            <UCalendar
                              v-model="reservationExpiresDate"
                              :min-value="minDate"
                              class="p-2"
                            />
                          </template>
                        </UPopover>
                      </template>
                    </UInputDate>

                    <UInputTime
                      v-model="reservationExpiresTime"
                      class="w-full sm:w-auto"
                    />
                  </div>
                </UFormField>

                <UFormField
                  :label="$t('forms.reservation.holdNotes')"
                  name="note"
                >
                  <UTextarea
                    v-model="reservationForm.note"
                    class="w-full"
                    :rows="3"
                  />
                </UFormField>

                <div
                  v-if="reservationError && !Object.keys(reservationFieldErrors).length"
                  class="rounded-lg border border-error/30 bg-error/5 p-3"
                >
                  <p class="text-xs text-error">
                    {{ reservationError }}
                  </p>
                </div>

                <div>
                  <UButton
                    type="submit"
                    :label="$t('pages.unitMap.reserve')"
                    color="primary"
                    :loading="reservationSubmitting || contactFormNormalSubmitting"
                  />
                </div>
              </form>
            </div>
          </template>

          <!-- Non-free status info -->
          <template v-else>
            <!-- Loading -->
            <div
              v-if="occupancyLoading"
              class="flex items-center justify-center px-5 py-8"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-5 animate-spin text-dimmed"
              />
            </div>

            <!-- Occupied: active contract -->
            <template v-else-if="clickedUnit.state === 'occupied'">
              <div
                v-if="activeContract"
                class="px-5 py-4"
              >
                <h3 class="mb-3 text-sm font-medium text-highlighted">
                  Active contract
                </h3>
                <dl class="space-y-2 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Tenant
                    </dt>
                    <dd class="text-right font-medium text-highlighted">
                      <UButton
                        :label="activeContract.contact?.name ?? '—'"
                        color="neutral"
                        variant="link"
                        size="sm"
                        class="h-auto p-0"
                        :to="`/leasing/contacts/${activeContract.contact_id}`"
                      />
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Rate
                    </dt>
                    <dd class="text-right font-medium text-primary">
                      {{
                        (() => {
                          const unitItem = activeContract.items?.find(i => i.item_type === 'unit')
                          const price = clickedUnitPrice
                          if (!unitItem) return '—'
                          return price
                            ? formatCurrencyAmount(unitItem.amount, price.currency) + ' / ' + price.billing_period
                            : unitItem.amount
                        })()
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Start date
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ activeContract.start_date }}
                    </dd>
                  </div>
                  <div
                    v-if="activeContract.end_date"
                    class="flex justify-between gap-4"
                  >
                    <dt class="text-dimmed">
                      End date
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ activeContract.end_date }}
                    </dd>
                  </div>
                </dl>
                <UButton
                  :to="`/leasing/contracts/${activeContract.id}`"
                  :label="$t('pages.contracts.viewContract')"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="mt-4"
                />
              </div>
              <div
                v-else
                class="px-5 py-4"
              >
                <p class="text-sm text-dimmed">
                  This unit is occupied but no active contract was found.
                </p>
              </div>
            </template>

            <!-- Reserved: active reservation -->
            <template v-else-if="clickedUnit.state === 'reserved'">
              <div
                v-if="activeReservation"
                class="px-5 py-4"
              >
                <h3 class="mb-3 text-sm font-medium text-highlighted">
                  Active reservation
                </h3>
                <dl class="space-y-2 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Contact
                    </dt>
                    <dd class="text-right font-medium text-highlighted">
                      <UButton
                        :label="activeReservation.contact?.name ?? '—'"
                        color="neutral"
                        variant="link"
                        size="sm"
                        class="h-auto p-0"
                        :to="`/leasing/contacts/${activeReservation.contact_id}`"
                      />
                    </dd>
                  </div>
                  <div
                    v-if="activeReservation.price"
                    class="flex justify-between gap-4"
                  >
                    <dt class="text-dimmed">
                      Price
                    </dt>
                    <dd class="text-right font-medium text-primary">
                      {{ formatCurrencyAmount(activeReservation.price.amount, activeReservation.price.currency) }}
                      / {{ activeReservation.price.billing_period }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Expires
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ new Date(activeReservation.expires_at).toLocaleDateString() }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      Status
                    </dt>
                    <dd class="text-right text-highlighted capitalize">
                      {{ activeReservation.status }}
                    </dd>
                  </div>
                </dl>
                <UButton
                  :to="`/leasing/reservations/${activeReservation.id}`"
                  label="View reservation"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="mt-4"
                />
              </div>
              <div
                v-else
                class="px-5 py-4"
              >
                <p class="text-sm text-dimmed">
                  This unit has a reservation but the details could not be loaded.
                </p>
              </div>
            </template>

            <!-- Archived / disabled -->
            <template v-else-if="clickedUnit.enabled === false">
              <div class="px-5 py-4">
                <p class="text-sm text-dimmed">
                  {{ $t('pages.unitMap.unitDisabled') }}
                </p>
              </div>
            </template>

            <!-- Out of service / held -->
            <template v-else-if="clickedUnit.current_hold">
              <div class="px-5 py-4">
                <h3 class="mb-3 text-sm font-medium text-highlighted">
                  {{ $t('units.holds.activeHold') }}
                </h3>
                <dl class="space-y-2 text-sm">
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.holdType') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ $t(`units.holds.types.${clickedUnit.current_hold.hold_type}`) }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-4">
                    <dt class="text-dimmed">
                      {{ $t('units.map.holdEnds') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{
                        clickedUnit.current_hold.ends_on
                          ? clickedUnit.current_hold.ends_on
                          : $t('units.holds.indefinite')
                      }}
                    </dd>
                  </div>
                  <div
                    v-if="clickedUnit.current_hold.reason"
                    class="flex justify-between gap-4"
                  >
                    <dt class="text-dimmed">
                      {{ $t('units.holds.reason') }}
                    </dt>
                    <dd class="text-right text-highlighted">
                      {{ clickedUnit.current_hold.reason }}
                    </dd>
                  </div>
                </dl>
                <UButton
                  :to="`/facility/units/${clickedUnit.id}`"
                  :label="$t('units.detail.viewUnit')"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="mt-4"
                />
              </div>
            </template>
          </template>
        </div>
      </template>

      <!-- ── Offer mode ── -->
      <template v-else>
        <!-- Header -->
        <div class="border-b border-default px-5 py-4">
          <div
            v-if="createdOffer"
            class="flex items-center justify-between gap-2"
          >
            <h2 class="text-base font-semibold text-highlighted">
              {{ $t('pages.unitMap.offerCreated') }}
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
              class="capitalize"
            >
              {{ createdOffer.status }}
            </UBadge>
          </div>
          <div
            v-else
            class="flex items-center justify-between"
          >
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ $t('pages.unitMap.newOffer') }}
              </h2>
              <p
                v-if="selectedUnitNumbers.size"
                class="mt-0.5 text-xs text-dimmed"
              >
                {{ selectedUnitNumbers.size }}
                {{ $t('pages.unitMap.unitsSelected', selectedUnitNumbers.size) }}
              </p>
            </div>
            <UButton
              v-if="selectedUnitNumbers.size"
              :label="$t('pages.unitMap.clearAll')"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="clearOfferSelection"
            />
          </div>
        </div>

        <!-- Offer preview -->
        <div
          v-if="createdOffer"
          class="flex flex-1 flex-col overflow-y-auto"
        >
          <div class="flex flex-col gap-4 px-5 py-4">
            <dl class="space-y-2 text-sm">
              <div
                v-if="capturedMoveInDate"
                class="flex justify-between gap-4"
              >
                <dt class="text-dimmed">
                  {{ $t('pages.unitMap.offerPreviewMoveIn') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ formatIsoDate(capturedMoveInDate) }}
                </dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-dimmed">
                  {{ $t('pages.unitMap.offerPreviewExpires') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ new Date(createdOffer.expires_at).toLocaleString() }}
                </dd>
              </div>
              <div
                v-if="createdOffer.contact?.name"
                class="flex justify-between gap-4"
              >
                <dt class="text-dimmed">
                  {{ $t('pages.unitMap.contact') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ createdOffer.contact.name }}
                </dd>
              </div>
            </dl>

            <div class="border-t border-default pt-4">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
                {{ $t('forms.offer.options') }}
              </p>
              <div class="space-y-2">
                <div
                  v-for="option in createdOfferOptions"
                  :key="option.id"
                  class="flex items-start justify-between gap-3 rounded-lg border border-default px-3 py-2"
                >
                  <span class="min-w-0 flex-1 text-sm text-highlighted">{{ option.label }}</span>
                  <span class="shrink-0 text-sm font-medium text-primary">
                    {{ formatOfferOptionPrice(option) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="border-t border-default pt-4">
              <p class="mb-2 text-xs font-medium text-dimmed">
                {{ $t('pages.unitMap.copyLink') }}
              </p>
              <div class="flex items-center gap-2">
                <p class="min-w-0 flex-1 truncate text-xs text-muted">
                  {{ offerShareUrl }}
                </p>
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  square
                  :aria-label="$t('pages.unitMap.copyLink')"
                  @click="copyOfferLink"
                />
              </div>
            </div>

            <div class="border-t border-default pt-4">
              <UFormField
                :label="$t('pages.unitMap.sendChannel')"
                name="send_channel"
              >
                <div class="flex gap-2">
                  <USelect
                    v-model="sendChannel"
                    :items="sendChannelOptions"
                    value-key="value"
                    label-key="label"
                    :placeholder="$t('pages.unitMap.sendChannel')"
                    class="min-w-0 flex-1"
                  />
                  <UButton
                    :label="$t('pages.unitMap.send')"
                    color="primary"
                    :disabled="!sendChannel"
                    @click="onSendOffer"
                  />
                </div>
              </UFormField>
            </div>

            <div class="pt-2">
              <UButton
                :label="$t('pages.unitMap.newOffer')"
                color="neutral"
                variant="outline"
                @click="clearOfferSelection"
              />
            </div>
          </div>
        </div>

        <!-- No units selected -->
        <div
          v-else-if="!selectedUnitNumbers.size"
          class="flex flex-1 items-center justify-center p-8 text-center"
        >
          <p class="text-sm text-dimmed">
            {{ $t('pages.unitMap.noUnitsSelected') }}
          </p>
        </div>

        <!-- Offer form -->
        <div
          v-else
          class="flex flex-1 flex-col overflow-y-auto"
        >
          <!-- Selected units list -->
          <div class="border-b border-default px-5 py-3">
            <div class="space-y-2">
              <div
                v-for="unit in selectedUnits"
                :key="unit.id"
                class="flex items-center justify-between gap-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2">
                    <span class="text-sm font-medium text-highlighted">{{ unit.unit_number }}</span>
                    <span class="truncate text-xs text-dimmed">{{ formatUnitClass(unit) }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-dimmed">{{ formatUnitDimensions(unit) }}</span>
                    <span class="text-xs font-medium text-primary">
                      {{ formatUnitMapPrice(priceByUnitClassId.get(unit.unit_class_id), t, emptyValue) }}
                    </span>
                  </div>
                </div>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :aria-label="$t('common.remove', 'Remove')"
                  @click="removeSelectedUnit(unit.unit_number)"
                />
              </div>
            </div>
          </div>

          <!-- Offer form fields -->
          <div class="flex-1 px-5 py-4">
            <form
              class="flex flex-col gap-4"
              @submit.prevent="onCreateOffer"
            >
              <!-- Contact -->
              <UFormField
                :label="$t('pages.unitMap.contact')"
                name="contact_id"
                required
              >
                <div class="flex flex-col gap-3">
                  <UTabs
                    v-model="contactTabOffer"
                    :items="contactTabItems"
                    :content="false"
                    value-key="value"
                    size="xs"
                  />

                  <USelectMenu
                    v-if="contactTabOffer === 'select'"
                    v-model:search-term="offerContactSearch"
                    :model-value="offerContactId ?? undefined"
                    :items="contactItemsOffer"
                    value-key="value"
                    ignore-filter
                    :loading="contactPendingOffer"
                    :placeholder="$t('pages.unitMap.contact')"
                    class="w-full"
                    @update:model-value="(v: number | null | undefined) => { offerContactId = v ?? null }"
                  />

                  <div
                    v-else
                    class="flex flex-col gap-3"
                  >
                    <UFormField
                      :label="$t('forms.contact.firstName')"
                      name="first_name"
                      required
                      :error="contactFormOfferFieldError('first_name')"
                    >
                      <UInput
                        v-model="contactFormOffer.first_name"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('forms.contact.lastName')"
                      name="last_name"
                      required
                      :error="contactFormOfferFieldError('last_name')"
                    >
                      <UInput
                        v-model="contactFormOffer.last_name"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      :label="$t('forms.contact.email')"
                      name="email"
                      :error="contactFormOfferFieldError('email')"
                    >
                      <UInput
                        v-model="contactFormOffer.email"
                        type="email"
                        class="w-full"
                      />
                    </UFormField>

                    <div
                      v-if="contactFormOfferError && !Object.keys(contactFormOfferFieldErrors).length"
                      class="rounded-lg border border-error/30 bg-error/5 p-3"
                    >
                      <p class="text-xs text-error">
                        {{ contactFormOfferError }}
                      </p>
                    </div>
                  </div>
                </div>
              </UFormField>

              <!-- Move-in date -->
              <UFormField
                :label="$t('pages.unitMap.moveInDate')"
                name="move_in_date"
              >
                <UInputDate
                  v-model="offerMoveInDate"
                  :min-value="minDate"
                  class="w-full"
                />
              </UFormField>

              <!-- Offer expires -->
              <UFormField
                :label="$t('pages.unitMap.offerExpires')"
                name="expires_at"
                required
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <UInputDate
                    ref="offerExpiresAtInput"
                    v-model="offerExpiresDate"
                    :min-value="minDate"
                    class="w-full flex-1"
                  >
                    <template #trailing>
                      <UPopover :reference="offerExpiresAtInput?.inputsRef[3]?.$el">
                        <UButton
                          color="neutral"
                          variant="link"
                          size="sm"
                          icon="i-lucide-calendar"
                          class="px-0"
                        />
                        <template #content>
                          <UCalendar
                            v-model="offerExpiresDate"
                            :min-value="minDate"
                            class="p-2"
                          />
                        </template>
                      </UPopover>
                    </template>
                  </UInputDate>

                  <UInputTime
                    v-model="offerExpiresTime"
                    class="w-full sm:w-auto"
                  />
                </div>
              </UFormField>

              <!-- Storage reason -->
              <UFormField
                :label="$t('pages.unitMap.storageReason')"
                name="storage_reason"
              >
                <USelect
                  v-model="offerStorageReason"
                  :items="storageReasonOptions"
                  value-key="value"
                  label-key="label"
                  :placeholder="$t('pages.unitMap.storageReason')"
                  class="w-full"
                />
              </UFormField>

              <!-- Status -->
              <UFormField
                :label="$t('pages.unitMap.offerStatus')"
                name="status"
              >
                <USelect
                  v-model="offerStatus"
                  :items="offerStatusOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <!-- Actions -->
              <div class="flex gap-2 pt-2">
                <UButton
                  type="submit"
                  :label="$t('pages.unitMap.createOffer')"
                  color="primary"
                  :loading="offerSubmitting || contactFormOfferSubmitting"
                  :disabled="(contactTabOffer === 'select' && !offerContactId) || !offerExpiresAtString"
                />
                <UButton
                  type="button"
                  :label="$t('pages.unitMap.cancel')"
                  color="neutral"
                  variant="outline"
                  :disabled="offerSubmitting || contactFormOfferSubmitting"
                  @click="clearOfferSelection"
                />
              </div>
            </form>
          </div>
        </div>
      </template>
    </aside>
  </div>
</template>
