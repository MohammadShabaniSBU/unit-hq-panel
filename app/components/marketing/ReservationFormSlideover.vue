<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { ApiOption } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  initialDealId?: number
  initialContactId?: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useReservationForm()

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

const expiresAt = computed({
  get: () => parseIsoDate(form.expires_at),
  set: (value: CalendarDate | null) => { form.expires_at = formatIsoDate(value) }
})

const expiresAtInput = useTemplateRef('expiresAtInput')
const minDate = today(getLocalTimeZone())

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    if (props.initialDealId) form.deal_id = props.initialDealId
    if (props.initialContactId) form.contact_id = props.initialContactId
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

  toast.add({ title: t('forms.reservation.createSuccessMessage'), color: 'success' })
  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('forms.reservation.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.reservation.contact')"
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
            :placeholder="$t('forms.reservation.contact')"
            :disabled="!!props.initialContactId"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.reservation.unit')"
          name="unit_id"
          required
          :error="fieldError('unit_id')"
        >
          <USelect
            v-model="form.unit_id"
            :items="unitItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.reservation.unit')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.reservation.expiresAt')"
          name="expires_at"
          required
          :error="fieldError('expires_at')"
        >
          <UInputDate
            ref="expiresAtInput"
            v-model="expiresAt"
            :min-value="minDate"
            class="w-full"
          >
            <template #trailing>
              <UPopover :reference="expiresAtInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="expiresAt"
                    :min-value="minDate"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <UFormField
          :label="$t('forms.reservation.holdNotes')"
          name="hold_notes"
          :error="fieldError('hold_notes')"
        >
          <UTextarea
            v-model="form.hold_notes"
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
            :label="$t('forms.reservation.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.reservation.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
