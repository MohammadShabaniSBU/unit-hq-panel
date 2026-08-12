<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { useDebounceFn } from '@vueuse/core'
import { commitmentToWeeks } from '~/composables/useDiscountOptions'
import type { CreateAttributeValue } from '~/composables/useRequiredCreateAttributes'
import { formatMoney } from '~/composables/useMoney'
import type { ApiDiscountResolution } from '~/types/discount'
import type { ApiInsuranceOption, ApiOption, ApiUnitOption, DiscountKind } from '~/types/facility'
import type { ApiBillingSettings } from '~/types/settings'

// TODO(S03-01 / gestor #2): collect contact fiscal identity (NIF + billing address)
// at signing/onboarding once it is confirmed that ordinary invoices (not facturas
// simplificadas) are required for self-storage rents.

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  initialContactId?: number
  initialDealId?: number
  initialReservationId?: number
  initialUnitId?: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { get } = useApi()
const {
  form,
  submitting,
  error,
  fieldErrors,
  preview,
  previewPending,
  previewError,
  reset,
  submit,
  fetchConvertPreview
} = useContractForm()
const {
  definitions: requiredDefinitions,
  values: attributeValues,
  fieldErrors: attributeFieldErrors,
  validate: validateAttributes,
  toPayload: attributesPayload,
  reset: resetAttributes,
  applyServerErrors: applyAttributeServerErrors
} = useRequiredCreateAttributes('contract')

function onAttributeValue(definitionId: number, value: CreateAttributeValue) {
  attributeValues[definitionId] = value
}

const isConvertMode = computed(() => !!props.initialReservationId)
const router = useRouter()

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const selectedSiteId = ref<number | null>(null)
const insuranceItems = ref<Array<ApiInsuranceOption>>([])
const insurancePending = ref(false)
const unitRateTouched = ref(false)
const moveInDateTouched = ref(false)
const depositTouched = ref(false)
const wizardContractId = ref<number | null>(null)

const signatureModeItems = computed(() => [
  { label: t('forms.contract.signatureModeImmediate'), value: 'immediate' as const },
  { label: t('forms.contract.signatureModeRemote'), value: 'remote' as const }
])

const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const { data: unitOptionsData, pending: unitPending } = useAsyncData(
  'options:/api/units/options',
  () => get<Array<ApiUnitOption>>('/api/units/options')
)

const { items: taxRateItems } = useTaxRateOptions()
const { selectItems: discountSelectItems, items: discountItems, pending: discountPending } = useDiscountOptions()
const { resolveDiscount } = useDiscountResolve()

const unitItems = computed(() => unitOptionsData.value?.data ?? [])
const walkInResolution = ref<ApiDiscountResolution | null>(null)
const walkInResolutionPending = ref(false)

const selectedDiscountKind = computed<DiscountKind | null>(() => {
  if (!form.discount_id) return null
  return discountItems.value.find(item => item.value === form.discount_id)?.kind ?? null
})

const showCommitmentFields = computed(() =>
  !isConvertMode.value
  && selectedDiscountKind.value === 'free_time'
  && !props.initialDealId
)

const commitmentPeriodItems = computed(() => [
  { value: 'week' as const, label: t('discounts.commitmentPeriodWeek') },
  { value: 'month' as const, label: t('discounts.commitmentPeriodMonth') }
])

const contactSelectItems = computed(() => {
  if (!selectedContact.value) return contactItems.value
  const has = contactItems.value.some(i => i.value === selectedContact.value!.value)
  return has ? contactItems.value : [selectedContact.value, ...contactItems.value]
})

const selectedUnitOption = computed(() =>
  unitItems.value.find(item => item.value === form.unit_id) ?? null
)

const currency = computed(() =>
  preview.value?.currency
  ?? selectedUnitOption.value?.price_currency
  ?? null
)

function displayMoney(amount: string | null | undefined, currencyCode: string | null | undefined = currency.value) {
  if (!amount?.trim()) {
    return t('forms.contract.rateUnavailable')
  }

  return formatMoney(amount, currencyCode, locale.value)
}

const insuranceRateDisplay = computed(() =>
  displayMoney(form.insurance_rate, selectedUnitOption.value?.price_currency ?? null)
)

const billingCadenceLabel = computed(() => {
  const interval = preview.value?.billing_interval
  if (!interval) return null

  return formatBillingCadence(interval, preview.value?.billing_interval_count ?? 1, t)
})

function onContactSelect(id: number | null | undefined) {
  form.contact_id = id ?? null
  selectedContact.value = id ? contactItems.value.find(i => i.value === id) ?? null : null
}

function clearInsuranceSelection() {
  form.insurance_id = null
  form.insurance_rate = ''
  form.insurance_tax_rate_id = null
}

async function loadInsuranceOptions(siteId: number) {
  insurancePending.value = true

  try {
    const response = await get<Array<ApiInsuranceOption>>('/api/insurances/options', { site_id: siteId })
    insuranceItems.value = response.data ?? []
  } finally {
    insurancePending.value = false
  }
}

function applyUnitSelection(unitId: number | null | undefined) {
  form.unit_id = unitId ?? null

  const option = unitId
    ? unitItems.value.find(item => item.value === unitId) ?? null
    : null

  if (!isConvertMode.value || !unitRateTouched.value) {
    form.unit_rate = option?.price_amount ?? ''
  }

  clearInsuranceSelection()

  const siteId = option?.site_id ?? null
  selectedSiteId.value = siteId
  insuranceItems.value = []

  if (siteId) {
    void loadInsuranceOptions(siteId)
  }
}

function onInsuranceSelect(insuranceId: number | null | undefined) {
  form.insurance_id = insuranceId ?? null

  const option = insuranceId
    ? insuranceItems.value.find(item => item.value === insuranceId) ?? null
    : null

  form.insurance_rate = option?.rate ?? ''
}

async function refreshWalkInResolution() {
  if (!form.discount_id || isConvertMode.value) {
    walkInResolution.value = null
    return
  }

  walkInResolutionPending.value = true
  try {
    const commitmentWeeks = form.commitment_length && form.commitment_period
      ? commitmentToWeeks(form.commitment_length, form.commitment_period)
      : null

    walkInResolution.value = await resolveDiscount({
      discountId: form.discount_id,
      dealId: form.deal_id,
      commitmentWeeks: showCommitmentFields.value ? commitmentWeeks : null,
      listAmount: form.unit_rate || selectedUnitOption.value?.price_amount || null,
      currency: selectedUnitOption.value?.price_currency || null,
      anchorDate: form.start_date || form.move_in_date || null
    })
  } finally {
    walkInResolutionPending.value = false
  }
}

async function onDiscountSelect(discountId: number | null | undefined) {
  form.discount_id = discountId ?? null
  if (!discountId) {
    form.commitment_length = null
    form.commitment_period = null
    walkInResolution.value = null
    return
  }
  await refreshWalkInResolution()
}

function parseIsoDate(value: string): CalendarDate | null {
  if (!value.trim()) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const startDate = computed({
  get: () => parseIsoDate(form.start_date),
  set: (v: CalendarDate | null) => {
    form.start_date = formatIsoDate(v)
    if (!moveInDateTouched.value) {
      form.move_in_date = form.start_date
    }
  }
})

const moveInDate = computed({
  get: () => parseIsoDate(form.move_in_date),
  set: (v: CalendarDate | null) => {
    form.move_in_date = formatIsoDate(v)
    moveInDateTouched.value = true
  }
})

const startDateInput = useTemplateRef('startDateInput')
const moveInDateInput = useTemplateRef('moveInDateInput')
const minDate = today(getLocalTimeZone())

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

const refreshPreview = useDebounceFn(async () => {
  if (!open.value || !isConvertMode.value) return

  const data = await fetchConvertPreview({
    includeUnitRate: unitRateTouched.value
  })
  if (!data) return

  if (!unitRateTouched.value && (Number(data.suggested_unit_rate) > 0 || data.discount)) {
    form.unit_rate = data.suggested_unit_rate
  }

  if (!depositTouched.value) {
    form.deposit_amount = data.deposit_amount
  }
}, 300)

watch(open, async (isOpen) => {
  if (isOpen) {
    unitRateTouched.value = false
    moveInDateTouched.value = false
    depositTouched.value = false

    if (props.initialContactId) form.contact_id = props.initialContactId
    if (props.initialDealId) form.deal_id = props.initialDealId
    if (props.initialReservationId) form.reservation_id = props.initialReservationId

    if (!form.start_date) {
      form.start_date = formatIsoDate(today(getLocalTimeZone()))
    }

    if (!form.move_in_date) {
      form.move_in_date = form.start_date
    }

    if (props.initialUnitId) {
      applyUnitSelection(props.initialUnitId)
    }

    if (isConvertMode.value) {
      await refreshPreview()
    } else if (!form.deposit_amount) {
      const response = await get<ApiBillingSettings>('/api/settings/billing')
      if (!depositTouched.value) {
        form.deposit_amount = response.data?.default_deposit_amount ?? ''
      }
    }
  }

  if (!isOpen) {
    reset()
    resetAttributes()
    contactSearch.value = ''
    selectedContact.value = null
    selectedSiteId.value = null
    insuranceItems.value = []
    walkInResolution.value = null
    unitRateTouched.value = false
    moveInDateTouched.value = false
    depositTouched.value = false
    wizardContractId.value = null
  }
})

watch(unitItems, (items) => {
  if (!open.value || !form.unit_id || form.unit_rate) {
    return
  }

  const option = items.find(item => item.value === form.unit_id)

  if (!option) {
    return
  }

  if (!isConvertMode.value || !unitRateTouched.value) {
    form.unit_rate = option.price_amount ?? ''
  }

  if (!selectedSiteId.value && option.site_id) {
    selectedSiteId.value = option.site_id
    void loadInsuranceOptions(option.site_id)
  }
})

watch(
  () => [
    form.start_date,
    form.move_in_date,
    form.unit_rate,
    form.insurance_id,
    form.insurance_rate,
    form.deposit_amount,
    form.commitment_length,
    form.commitment_period
  ] as const,
  () => {
    if (open.value && isConvertMode.value) {
      void refreshPreview()
    }
    if (open.value && !isConvertMode.value && form.discount_id) {
      void refreshWalkInResolution()
    }
  }
)

watch(
  () => form.discount_id,
  () => {
    if (open.value && !isConvertMode.value) {
      void refreshWalkInResolution()
    }
  }
)

async function onSubmit() {
  if (showCommitmentFields.value && (!form.commitment_length || !form.commitment_period)) {
    fieldErrors.value = {
      ...fieldErrors.value,
      commitment_weeks: [t('discounts.commitmentRequired')]
    }
    return
  }

  if (!isConvertMode.value && !validateAttributes()) {
    return
  }

  const saved = await submit(isConvertMode.value ? undefined : attributesPayload())
  if (!saved) {
    if (!isConvertMode.value) {
      applyAttributeServerErrors(fieldErrors.value)
    }
    return
  }

  toast.add({
    title: isConvertMode.value
      ? t('forms.contract.convertSuccessMessage')
      : t('forms.contract.createSuccessMessage'),
    color: 'success'
  })
  emit('saved')

  if (form.signature_mode === 'remote') {
    wizardContractId.value = saved.id
    return
  }

  close()
}

function finishWizard() {
  const id = wizardContractId.value
  close()
  if (id) {
    void router.push(`/leasing/contracts/${id}`)
  }
}

function skipWizard() {
  finishWizard()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="wizardContractId
      ? $t('contracts.signature.wizard.title')
      : (isConvertMode ? $t('forms.contract.convertTitle') : $t('forms.contract.createTitle'))"
  >
    <template #body>
      <ContractsContractRemoteSignatureWizard
        v-if="wizardContractId"
        :contract-id="wizardContractId"
        @done="finishWizard"
        @skip="skipWizard"
      />

      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.contract.contact')"
          name="contact_id"
          required
          :error="fieldError('contact_id')"
        >
          <USelectMenu
            v-model:search-term="contactSearch"
            :model-value="form.contact_id ?? undefined"
            :items="contactSelectItems"
            value-key="value"
            ignore-filter
            :loading="contactPending"
            :placeholder="$t('forms.contract.contact')"
            :disabled="!!props.initialContactId"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contract.unit')"
          name="unit_id"
          required
          :error="fieldError('items.0.item_id')"
        >
          <USelect
            :model-value="form.unit_id ?? undefined"
            :items="unitItems"
            value-key="value"
            label-key="label"
            :loading="unitPending"
            :placeholder="$t('forms.contract.unit')"
            :disabled="!!props.initialUnitId"
            class="w-full"
            @update:model-value="applyUnitSelection"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.contract.startDate')"
            name="start_date"
            required
            :error="fieldError('start_date')"
          >
            <UInputDate
              ref="startDateInput"
              v-model="startDate"
              :min-value="minDate"
              class="w-full"
            >
              <template #trailing>
                <UPopover :reference="startDateInput?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    class="px-0"
                  />
                  <template #content>
                    <UCalendar
                      v-model="startDate"
                      :min-value="minDate"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
          </UFormField>

          <UFormField
            :label="$t('forms.contract.moveInDate')"
            name="move_in_date"
            :error="fieldError('move_in_date')"
          >
            <UInputDate
              ref="moveInDateInput"
              v-model="moveInDate"
              class="w-full"
            >
              <template #trailing>
                <UPopover :reference="moveInDateInput?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    class="px-0"
                  />
                  <template #content>
                    <UCalendar
                      v-model="moveInDate"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('forms.contract.unitRate')"
            name="unit_rate"
            required
            :error="fieldError('unit_rate') || fieldError('items.0.amount')"
          >
            <UInput
              v-if="isConvertMode"
              v-model="form.unit_rate"
              type="number"
              step="0.01"
              min="0"
              class="w-full"
              @update:model-value="unitRateTouched = true"
            />
            <p
              v-else
              class="min-h-9 rounded-md border border-default bg-muted/30 px-3 py-2 text-sm text-highlighted"
            >
              {{ displayMoney(form.unit_rate, selectedUnitOption?.price_currency) }}
            </p>
          </UFormField>

          <UFormField
            :label="$t('forms.contract.unitTaxRate')"
            name="unit_tax_rate_id"
            :error="fieldError('unit_tax_rate_id') || fieldError('items.0.tax_rate_id')"
          >
            <USelect
              :model-value="form.unit_tax_rate_id ?? undefined"
              :items="taxRateItems"
              value-key="value"
              label-key="label"
              :placeholder="$t('forms.contract.taxRatePlaceholder')"
              class="w-full"
              @update:model-value="(v) => form.unit_tax_rate_id = v ?? null"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="!isConvertMode"
          :label="$t('discounts.label')"
          name="discount_id"
          :error="fieldError('discount_id')"
        >
          <USelect
            :model-value="form.discount_id ?? undefined"
            :items="discountSelectItems"
            value-key="value"
            label-key="label"
            :loading="discountPending || walkInResolutionPending"
            :placeholder="$t('discounts.selectPlaceholder')"
            class="w-full"
            @update:model-value="onDiscountSelect"
          />
        </UFormField>

        <div
          v-if="showCommitmentFields"
          class="grid gap-4 sm:grid-cols-2"
        >
          <UFormField
            :label="$t('discounts.commitmentLength')"
            name="commitment_length"
            required
            :error="fieldError('commitment_weeks') || fieldError('commitment_length')"
          >
            <UInput
              :model-value="form.commitment_length ?? undefined"
              type="number"
              min="1"
              class="w-full"
              @update:model-value="(v) => form.commitment_length = v ? Number(v) : null"
            />
          </UFormField>
          <UFormField
            :label="$t('discounts.commitmentPeriod')"
            name="commitment_period"
            required
          >
            <USelect
              :model-value="form.commitment_period ?? undefined"
              :items="commitmentPeriodItems"
              value-key="value"
              label-key="label"
              :placeholder="$t('discounts.commitment')"
              class="w-full"
              @update:model-value="(v) => form.commitment_period = v ?? null"
            />
          </UFormField>
        </div>

        <p
          v-if="!isConvertMode && walkInResolution?.warning === 'no_stay_length'"
          class="text-xs text-warning"
        >
          {{ $t('discounts.noStayWarning') }}
        </p>
        <p
          v-else-if="!isConvertMode && walkInResolution?.promo_line"
          class="text-xs text-highlighted"
        >
          {{ walkInResolution.promo_line }}
        </p>

        <UFormField
          :label="$t('forms.contract.insurance')"
          name="insurance_id"
          :error="fieldError('insurance_id') || fieldError('items.1.item_id')"
        >
          <USelect
            :model-value="form.insurance_id ?? undefined"
            :items="insuranceItems"
            value-key="value"
            label-key="label"
            :loading="insurancePending"
            :disabled="!selectedSiteId"
            :placeholder="selectedSiteId ? $t('forms.contract.insurance') : $t('forms.contract.selectUnitForInsurance')"
            class="w-full"
            @update:model-value="onInsuranceSelect"
          />
        </UFormField>

        <div
          v-if="form.insurance_id"
          class="grid gap-4 sm:grid-cols-2"
        >
          <UFormField
            :label="$t('forms.contract.insuranceRate')"
            name="insurance_rate"
            :error="fieldError('insurance_rate') || fieldError('items.1.amount')"
          >
            <p class="min-h-9 rounded-md border border-default bg-muted/30 px-3 py-2 text-sm text-highlighted">
              {{ insuranceRateDisplay }}
            </p>
          </UFormField>

          <UFormField
            :label="$t('forms.contract.insuranceTaxRate')"
            name="insurance_tax_rate_id"
            :error="fieldError('insurance_tax_rate_id') || fieldError('items.1.tax_rate_id')"
          >
            <USelect
              :model-value="form.insurance_tax_rate_id ?? undefined"
              :items="taxRateItems"
              value-key="value"
              label-key="label"
              :placeholder="$t('forms.contract.taxRatePlaceholder')"
              class="w-full"
              @update:model-value="(v) => form.insurance_tax_rate_id = v ?? null"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.contract.depositAmount')"
          name="deposit_amount"
          :error="fieldError('deposit_amount')"
        >
          <UInput
            v-model="form.deposit_amount"
            type="number"
            step="0.01"
            min="0"
            class="w-full"
            @update:model-value="depositTouched = true"
          />
        </UFormField>

        <template v-if="isConvertMode">
          <div
            v-if="previewPending && !preview"
            class="rounded-lg border border-default bg-muted/20 p-3 text-sm text-dimmed"
          >
            {{ $t('forms.contract.previewLoading') }}
          </div>

          <div
            v-else-if="previewError && !preview"
            class="rounded-lg border border-error/30 bg-error/5 p-3"
          >
            <p class="text-sm text-error">
              {{ previewError }}
            </p>
          </div>

          <div
            v-else-if="preview"
            class="flex flex-col gap-3 rounded-lg border border-default bg-muted/20 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-highlighted">
                {{ $t('forms.contract.moveInSummary') }}
              </p>
              <UIcon
                v-if="previewPending"
                name="i-lucide-loader-circle"
                class="size-4 animate-spin text-dimmed"
              />
            </div>

            <dl class="grid gap-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-dimmed">
                  {{ $t('forms.contract.contact') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ preview.contact.name }}
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-dimmed">
                  {{ $t('forms.contract.unit') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ preview.unit.unit_number }}
                  <span
                    v-if="preview.unit.unit_class"
                    class="text-dimmed"
                  >
                    · {{ preview.unit.unit_class.label }}
                  </span>
                </dd>
              </div>
              <div
                v-if="billingCadenceLabel"
                class="flex justify-between gap-3"
              >
                <dt class="text-dimmed">
                  {{ $t('forms.contract.billingCadenceLabel') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ billingCadenceLabel }}
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-dimmed">
                  {{ $t('forms.contract.recurringRate') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ displayMoney(preview.unit_rate) }}
                </dd>
              </div>
              <div
                v-if="preview.discount"
                class="flex justify-between gap-3"
              >
                <dt class="text-dimmed">
                  {{ $t('forms.contract.discount') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ displayMoney(preview.base_rate) }}
                  → {{ displayMoney(preview.suggested_unit_rate) }}
                  <span class="block text-xs text-dimmed">
                    {{ preview.discount.name }}
                    <template v-if="preview.discount_ends_at">
                      · {{ $t('forms.contract.discountEnds', { date: preview.discount_ends_at }) }}
                    </template>
                  </span>
                </dd>
              </div>

              <div
                v-if="preview.discount_schedule?.segments?.length && !preview.discount_schedule.noop"
                class="flex flex-col gap-1 border-t border-default pt-2"
              >
                <p class="text-xs font-medium text-dimmed">
                  {{ $t('discounts.scheduleTitle') }}
                </p>
                <div
                  v-for="(segment, index) in preview.discount_schedule.segments"
                  :key="`${segment.from}-${index}`"
                  class="flex justify-between gap-3 text-xs"
                >
                  <span class="text-dimmed">
                    <template v-if="segment.to">
                      {{ segment.from }} → {{ segment.to }}
                    </template>
                    <template v-else>
                      {{ $t('discounts.scheduleThereafter', { amount: displayMoney(segment.amount) }) }}
                    </template>
                  </span>
                  <span
                    v-if="segment.to"
                    class="font-medium text-highlighted"
                  >
                    {{ displayMoney(segment.amount) }}
                  </span>
                </div>
              </div>
              <div
                v-if="preview.insurance_rate"
                class="flex justify-between gap-3"
              >
                <dt class="text-dimmed">
                  {{ $t('forms.contract.insuranceRate') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ displayMoney(preview.insurance_rate) }}
                </dd>
              </div>
              <div
                v-if="Number(preview.deposit_amount) > 0"
                class="flex justify-between gap-3"
              >
                <dt class="text-dimmed">
                  {{ $t('forms.contract.depositAmount') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ displayMoney(preview.deposit_amount) }}
                </dd>
              </div>
            </dl>

            <UAlert
              v-if="preview.rate_overridden"
              color="warning"
              variant="subtle"
              :title="$t('forms.contract.rateOverrideWarning')"
              :description="$t('forms.contract.rateOverrideDescription', {
                suggested: displayMoney(preview.suggested_unit_rate)
              })"
            />

            <div class="border-t border-default pt-3">
              <p class="mb-2 text-sm font-medium text-highlighted">
                {{ $t('forms.contract.firstPeriodEstimate') }}
              </p>

              <p
                v-if="preview.first_period.skipped"
                class="text-sm text-dimmed"
              >
                {{ $t('forms.contract.firstPeriodSkipped') }}
              </p>

              <dl
                v-else
                class="grid gap-2 text-sm"
              >
                <div class="flex justify-between gap-3">
                  <dt class="text-dimmed">
                    {{ $t('forms.contract.firstPeriodDates') }}
                  </dt>
                  <dd class="text-right text-highlighted">
                    {{ preview.first_period.start_date }}
                    → {{ preview.first_period.end_date }}
                    <span
                      v-if="preview.first_period.has_stub && preview.first_period.days_occupied != null"
                      class="block text-xs text-dimmed"
                    >
                      {{ $t('forms.contract.firstPeriodDays', {
                        days: preview.first_period.days_occupied,
                        total: preview.first_period.days_in_period
                      }) }}
                    </span>
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-dimmed">
                    {{ $t('forms.contract.firstPeriodNet') }}
                  </dt>
                  <dd class="text-right text-highlighted">
                    {{ displayMoney(preview.first_period.total_net) }}
                  </dd>
                </div>
                <div
                  v-if="Number(preview.first_period.total_tax) > 0"
                  class="flex justify-between gap-3"
                >
                  <dt class="text-dimmed">
                    {{ $t('forms.contract.firstPeriodTax') }}
                  </dt>
                  <dd class="text-right text-highlighted">
                    {{ displayMoney(preview.first_period.total_tax) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-dimmed">
                    {{ $t('forms.contract.firstPeriodTotal') }}
                  </dt>
                  <dd class="text-right font-medium text-highlighted">
                    {{ displayMoney(preview.first_period.total_gross) }}
                  </dd>
                </div>
              </dl>
              <p class="mt-2 text-xs text-dimmed">
                {{ $t('forms.contract.firstPeriodHint') }}
              </p>
              <div
                v-if="preview.invoice_kind"
                class="mt-3 flex items-center justify-between gap-3 border-t border-default pt-3"
              >
                <dt class="text-dimmed">
                  {{ $t('forms.contract.invoiceKind') }}
                </dt>
                <dd class="text-right text-highlighted">
                  {{ preview.invoice_kind === 'ordinary'
                    ? $t('forms.contract.invoiceKindOrdinary')
                    : $t('forms.contract.invoiceKindSimplified') }}
                </dd>
              </div>
            </div>
          </div>
        </template>

        <UAlert
          v-if="previewError && previewError.includes('simplified')"
          color="warning"
          variant="subtle"
          :title="$t('forms.contract.invoiceBlockerSimplified')"
          class="mt-2"
        />

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <UFormField
          :label="$t('forms.contract.signatureMode')"
          name="signature_mode"
        >
          <URadioGroup
            v-model="form.signature_mode"
            :items="signatureModeItems"
            value-key="value"
            label-key="label"
            orientation="horizontal"
            class="w-full"
          />
          <p class="mt-1 text-xs text-dimmed">
            {{ form.signature_mode === 'remote'
              ? $t('forms.contract.signatureModeRemoteHint')
              : $t('forms.contract.signatureModeImmediateHint') }}
          </p>
        </UFormField>

        <RequiredAttributeFields
          v-if="!isConvertMode"
          :definitions="requiredDefinitions"
          :values="attributeValues"
          :field-errors="attributeFieldErrors"
          @update:value="onAttributeValue"
        />

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            :label="$t('forms.contract.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="form.signature_mode === 'remote'
              ? $t('forms.contract.saveRemote')
              : (isConvertMode ? $t('forms.contract.convertSave') : $t('forms.contract.save'))"
            color="primary"
            :loading="submitting"
            :disabled="Boolean(previewError && isConvertMode)"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
