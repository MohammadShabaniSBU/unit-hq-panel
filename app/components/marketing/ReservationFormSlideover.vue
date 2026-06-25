<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { ApiOption } from '~/types/facility'
import type { ApiDeal } from '~/types/deal'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  initialDealId?: number
  initialContactId?: number
  initialSiteId?: number
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()
const { form, submitting, error, fieldErrors, reset, submit } = useReservationForm()

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const { items: siteItems } = useOptions('/api/sites/options')

const siteId = computed(() => form.site_id)
const unitClassId = computed(() => form.unit_class_id)
const siteLocked = computed(() => !!props.initialDealId && form.site_id !== null)

const { data: unitClassOptionsData, pending: unitClassOptionsPending } = useAsyncData(
  () => `reservation:unit-class-options:${siteId.value ?? 'none'}`,
  async () => {
    if (!siteId.value) return null
    return get<ApiOption[]>('/api/unit-classes/options', { site_id: siteId.value })
  },
  { watch: [siteId] }
)

const unitClassItems = computed<Array<ApiOption>>(() => unitClassOptionsData.value?.data ?? [])

const { data: unitOptionsData, pending: unitOptionsPending } = useAsyncData(
  () => `reservation:unit-options:${siteId.value ?? 'none'}:${unitClassId.value ?? 'none'}`,
  async () => {
    if (!siteId.value || !unitClassId.value) return null
    return get<ApiOption[]>('/api/units/options', {
      site_id: siteId.value,
      unit_class_id: unitClassId.value
    })
  },
  { watch: [siteId, unitClassId] }
)

const unitItems = computed<Array<ApiOption>>(() => unitOptionsData.value?.data ?? [])

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

watch(siteId, (current, previous) => {
  if (current === previous) return
  form.unit_class_id = null
  form.unit_id = null
})

watch(unitClassId, (current, previous) => {
  if (current === previous) return
  form.unit_id = null
})

watch(open, async (isOpen) => {
  if (isOpen) {
    if (props.initialDealId) form.deal_id = props.initialDealId
    if (props.initialContactId) form.contact_id = props.initialContactId

    if (props.initialSiteId) {
      form.site_id = props.initialSiteId
    } else if (props.initialDealId) {
      try {
        const deal = await get<ApiDeal>(`/api/deals/${props.initialDealId}`)
        form.site_id = deal.data.site_id ?? null
      } catch {
        form.site_id = null
      }
    }
  }

  if (!isOpen) {
    reset()
    contactSearch.value = ''
    selectedContact.value = null
  }
})

async function onSubmit() {
  const result = await submit()
  if (!result) return

  toast.add({ title: t('forms.reservation.createSuccessMessage'), color: 'success' })

  if (!result.noteSaved) {
    toast.add({ title: t('forms.reservation.noteCreateErrorMessage'), color: 'warning' })
  }

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
          :label="$t('forms.reservation.site')"
          name="site_id"
          required
          :error="fieldError('site_id')"
        >
          <USelect
            v-model="form.site_id"
            :items="siteItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.reservation.site')"
            class="w-full"
            :disabled="siteLocked"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.reservation.unitClass')"
          name="unit_class_id"
          required
          :error="fieldError('unit_class_id')"
        >
          <USelect
            v-model="form.unit_class_id"
            :items="unitClassItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.reservation.unitClass')"
            class="w-full"
            :loading="unitClassOptionsPending"
            :disabled="!form.site_id"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.reservation.unit')"
          name="unit_id"
          :error="fieldError('unit_id')"
        >
          <USelect
            v-model="form.unit_id"
            :items="unitItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.reservation.unitOptional')"
            class="w-full"
            :loading="unitOptionsPending"
            :disabled="!form.site_id || !form.unit_class_id"
          />
          <p class="mt-1 text-xs text-dimmed">
            {{ $t('forms.reservation.autoAssignHint') }}
          </p>
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
          name="note"
        >
          <UTextarea
            v-model="form.note"
            class="w-full"
            :rows="4"
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
