<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { ApiOption } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  initialContactId?: number
  initialDealId?: number
  initialReservationId?: number
  initialUnitId?: number
  initialRate?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useContractForm()

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const { items: unitItems } = useOptions('/api/units/options')

const contactSelectItems = computed(() => {
  if (!selectedContact.value) return contactItems.value
  const has = contactItems.value.some(i => i.value === selectedContact.value!.value)
  return has ? contactItems.value : [selectedContact.value, ...contactItems.value]
})

function onContactSelect(id: number | null | undefined) {
  form.contact_id = id ?? null
  selectedContact.value = id ? contactItems.value.find(i => i.value === id) ?? null : null
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
    if (props.initialUnitId) form.unit_id = props.initialUnitId
    if (props.initialRate) form.unit_rate = props.initialRate
  }

  if (!isOpen) {
    reset()
    contactSearch.value = ''
    selectedContact.value = null
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
            v-model="form.unit_id"
            :items="unitItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.contract.unit')"
            :disabled="!!props.initialUnitId"
            class="w-full"
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
          <UInput
            v-model="form.unit_rate"
            type="number"
            step="0.01"
            min="0"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.contract.insuranceRate')"
          name="insurance_rate"
          :error="fieldError('items.1.rate')"
        >
          <UInput
            v-model="form.insurance_rate"
            type="number"
            step="0.01"
            min="0"
            class="w-full"
          />
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
