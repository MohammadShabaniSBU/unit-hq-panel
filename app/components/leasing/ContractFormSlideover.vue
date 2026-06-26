<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { ApiInsuranceOption, ApiOption, ApiUnitOption } from '~/types/facility'

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

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()
const { form, submitting, error, fieldErrors, reset, submit } = useContractForm()

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const selectedSiteId = ref<number | null>(null)
const insuranceItems = ref<Array<ApiInsuranceOption>>([])
const insurancePending = ref(false)

const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const { data: unitOptionsData, pending: unitPending } = useAsyncData(
  'options:/api/units/options',
  () => get<Array<ApiUnitOption>>('/api/units/options')
)

const unitItems = computed(() => unitOptionsData.value?.data ?? [])

const contactSelectItems = computed(() => {
  if (!selectedContact.value) return contactItems.value
  const has = contactItems.value.some(i => i.value === selectedContact.value!.value)
  return has ? contactItems.value : [selectedContact.value, ...contactItems.value]
})

const selectedUnitOption = computed(() =>
  unitItems.value.find(item => item.value === form.unit_id) ?? null
)

function formatRateDisplay(amount: string | null | undefined, currency: string | null | undefined) {
  if (!amount?.trim()) {
    return t('forms.contract.rateUnavailable')
  }

  return currency?.trim() ? `${amount} ${currency}` : amount
}

const unitRateDisplay = computed(() =>
  formatRateDisplay(form.unit_rate, selectedUnitOption.value?.price_currency ?? null)
)

const insuranceRateDisplay = computed(() =>
  formatRateDisplay(form.insurance_rate, selectedUnitOption.value?.price_currency ?? null)
)

function onContactSelect(id: number | null | undefined) {
  form.contact_id = id ?? null
  selectedContact.value = id ? contactItems.value.find(i => i.value === id) ?? null : null
}

function clearInsuranceSelection() {
  form.insurance_id = null
  form.insurance_rate = ''
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

  form.unit_rate = option?.price_amount ?? ''
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
  set: (v: CalendarDate | null) => { form.start_date = formatIsoDate(v) }
})

const startDateInput = useTemplateRef('startDateInput')
const minDate = today(getLocalTimeZone())

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    if (props.initialContactId) form.contact_id = props.initialContactId
    if (props.initialDealId) form.deal_id = props.initialDealId
    if (props.initialReservationId) form.reservation_id = props.initialReservationId

    if (props.initialUnitId) {
      applyUnitSelection(props.initialUnitId)
    }
  }

  if (!isOpen) {
    reset()
    contactSearch.value = ''
    selectedContact.value = null
    selectedSiteId.value = null
    insuranceItems.value = []
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

  form.unit_rate = option.price_amount ?? ''

  if (!selectedSiteId.value && option.site_id) {
    selectedSiteId.value = option.site_id
    void loadInsuranceOptions(option.site_id)
  }
})

async function onSubmit() {
  const saved = await submit()
  if (!saved) return

  toast.add({ title: t('forms.contract.createSuccessMessage'), color: 'success' })
  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('forms.contract.createTitle')"
  >
    <template #body>
      <form
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
          :label="$t('forms.contract.unitRate')"
          name="unit_rate"
          required
          :error="fieldError('items.0.rate')"
        >
          <p class="min-h-9 rounded-md border border-default bg-muted/30 px-3 py-2 text-sm text-highlighted">
            {{ unitRateDisplay }}
          </p>
        </UFormField>

        <UFormField
          :label="$t('forms.contract.insurance')"
          name="insurance_id"
          :error="fieldError('items.1.item_id')"
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

        <UFormField
          v-if="form.insurance_id"
          :label="$t('forms.contract.insuranceRate')"
          name="insurance_rate"
          :error="fieldError('items.1.rate')"
        >
          <p class="min-h-9 rounded-md border border-default bg-muted/30 px-3 py-2 text-sm text-highlighted">
            {{ insuranceRateDisplay }}
          </p>
        </UFormField>

        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

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
            :label="$t('forms.contract.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
