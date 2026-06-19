<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { OFFER_STATUSES } from '~/types/offer'
import type { ApiOption } from '~/types/facility'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { form, submitting, error, fieldErrors, reset, submit } = useOfferForm()

const dealSearch = ref('')
const selectedDeal = ref<ApiOption | null>(null)
const { items: dealItems, pending: dealPending } = useSearchOptions(
  '/api/deals/options',
  dealSearch,
  0
)

const contactSearch = ref('')
const selectedContact = ref<ApiOption | null>(null)
const { items: contactItems, pending: contactPending } = useSearchOptions(
  '/api/contacts/options',
  contactSearch
)

const dealSelectItems = computed(() => {
  if (!selectedDeal.value) {
    return dealItems.value
  }

  const hasSelected = dealItems.value.some(item => item.value === selectedDeal.value!.value)

  if (hasSelected) {
    return dealItems.value
  }

  return [selectedDeal.value, ...dealItems.value]
})

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

function onDealSelect(dealId: number | null | undefined) {
  form.deal_id = dealId ?? null

  if (!dealId) {
    selectedDeal.value = null
    return
  }

  selectedDeal.value = dealItems.value.find(item => item.value === dealId) ?? null
}

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

const expiresAt = computed({
  get: () => parseIsoDate(form.expires_at),
  set: (value: CalendarDate | null) => {
    form.expires_at = formatIsoDate(value)
  }
})

const expiresAtInput = useTemplateRef('expiresAtInput')
const minExpiresDate = today(getLocalTimeZone())

const statusOptions = computed(() =>
  OFFER_STATUSES.map(value => ({
    label: t(`offerStatus.${value}`),
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
    dealSearch.value = ''
    contactSearch.value = ''
    selectedDeal.value = null
    selectedContact.value = null
  }
})

async function onSubmit() {
  const savedOffer = await submit()

  if (!savedOffer) {
    return
  }

  toast.add({
    title: t('forms.offer.createSuccessMessage'),
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
    :title="$t('forms.offer.createTitle')"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="$t('forms.offer.deal')"
          name="deal_id"
          required
          :error="fieldError('deal_id')"
        >
          <USelectMenu
            v-model:search-term="dealSearch"
            :model-value="form.deal_id ?? undefined"
            :items="dealSelectItems"
            value-key="value"
            ignore-filter
            :loading="dealPending"
            :placeholder="$t('forms.offer.deal')"
            class="w-full"
            @update:model-value="onDealSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.offer.contact')"
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
            :placeholder="$t('forms.offer.contact')"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.offer.expiresAt')"
          name="expires_at"
          required
          :error="fieldError('expires_at')"
        >
          <UInputDate
            ref="expiresAtInput"
            v-model="expiresAt"
            :min-value="minExpiresDate"
            class="w-full"
          >
            <template #trailing>
              <UPopover :reference="expiresAtInput?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('forms.offer.expiresAt')"
                  class="px-0"
                />

                <template #content>
                  <UCalendar
                    v-model="expiresAt"
                    :min-value="minExpiresDate"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>

        <UFormField
          :label="$t('forms.offer.status')"
          name="status"
          :error="fieldError('status')"
        >
          <USelect
            v-model="form.status"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.offer.status')"
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
            :label="$t('forms.offer.cancel')"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="close"
          />
          <UButton
            type="submit"
            :label="$t('forms.offer.save')"
            color="primary"
            :loading="submitting"
          />
        </div>
      </form>
    </template>
  </USlideover>
</template>
