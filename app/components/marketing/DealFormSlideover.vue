<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { DEAL_STATUSES, STAY_PERIODS, STORAGE_REASONS } from '~/types/deal'
import type { ApiOption } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useDealForm()
const { items: unitClassItems } = useOptions('/api/unit-classes/options')

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const contactSelectItems = computed(() => {
  if (!selectedContact.value) {
    return contactItems.value
  }

  const hasSelected = contactItems.value.some(item => item.value === selectedContact.value!.value)

  if (hasSelected) {
    return contactItems.value
  }

  return [selectedContact.value, ...contactItems.value]
})

function onContactSelect(contactId: number | null | undefined) {
  form.contact_id = contactId ?? null

  if (!contactId) {
    selectedContact.value = null
    return
  }

  selectedContact.value = contactItems.value.find(item => item.value === contactId) ?? null
}

function parseIsoDate(value: string): CalendarDate | null {
  if (!value.trim()) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) {
    return ''
  }

  const month = String(value.month).padStart(2, '0')
  const day = String(value.day).padStart(2, '0')

  return `${value.year}-${month}-${day}`
}

const expectedMoveIn = computed({
  get: () => parseIsoDate(form.expected_move_in),
  set: (value: CalendarDate | null) => {
    form.expected_move_in = formatIsoDate(value)
  }
})

const expectedMoveInInput = useTemplateRef('expectedMoveInInput')
const minMoveInDate = today(getLocalTimeZone())

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

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
    contactSearch.value = ''
    selectedContact.value = null
  }
})

async function onSubmit() {
  const savedDeal = await submit()

  if (!savedDeal) {
    return
  }

  toast.add({
    title: t('forms.deal.createSuccessMessage'),
    color: 'success'
  })

  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('forms.deal.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.deal.contact')"
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
            :placeholder="$t('forms.deal.contact')"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.deal.status')"
          name="status"
          :error="fieldError('status')"
        >
          <USelect
            v-model="form.status"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.deal.status')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.deal.expectedMoveIn')"
          name="expected_move_in"
          :error="fieldError('expected_move_in')"
        >
          <UInputDate
            ref="expectedMoveInInput"
            v-model="expectedMoveIn"
            :min-value="minMoveInDate"
            class="w-full"
          >
            <template #trailing>
              <UPopover :reference="expectedMoveInInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('forms.deal.expectedMoveIn')"
                  class="px-0"
                />

                <template #content>
                  <UCalendar
                    v-model="expectedMoveIn"
                    :min-value="minMoveInDate"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <div class="flex gap-2">
          <UFormField
            :label="$t('forms.deal.expectedStayLength')"
            name="expected_stay_length"
            class="flex-1"
            :error="fieldError('expected_stay_length')"
          >
            <UInput
              v-model="form.expected_stay_length"
              type="number"
              min="1"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('forms.deal.expectedStayPeriod')"
            name="expected_stay_period"
            class="flex-1"
            :error="fieldError('expected_stay_period')"
          >
            <USelect
              v-model="form.expected_stay_period"
              :items="stayPeriodOptions"
              value-key="value"
              label-key="label"
              :placeholder="$t('forms.deal.expectedStayPeriod')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('forms.deal.storageReason')"
          name="storage_reason"
          :error="fieldError('storage_reason')"
        >
          <USelect
            v-model="form.storage_reason"
            :items="storageReasonOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.deal.storageReason')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.deal.desiredSize')"
          name="desired_size"
          :error="fieldError('desired_size')"
        >
          <UInput
            v-model="form.desired_size"
            type="number"
            step="0.01"
            min="0"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.deal.desiredUnitClass')"
          name="desired_unit_class_id"
          :error="fieldError('desired_unit_class_id')"
        >
          <USelect
            v-model="form.desired_unit_class_id"
            :items="unitClassItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.deal.desiredUnitClass')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.deal.intentNotes')"
          name="intent_notes"
          :error="fieldError('intent_notes')"
        >
          <UTextarea
            v-model="form.intent_notes"
            class="w-full"
            :rows="3"
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
            :label="$t('forms.deal.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.deal.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
