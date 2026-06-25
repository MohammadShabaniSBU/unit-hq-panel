<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { OFFER_STATUSES } from '~/types/offer'
import type { ApiOption } from '~/types/facility'
import type { OfferOptionForm } from '~/composables/useOfferForm'

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
const { get } = useApi()
const { form, submitting, error, fieldErrors, addOption, removeOption, reset, submit } = useOfferForm()

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

const { items: siteItems } = useOptions('/api/sites/options')

const optionUnitClassItems = ref<Array<Array<ApiOption>>>([])
const optionUnitClassLoading = ref<Array<boolean>>([])
const optionRateResolving = ref<Array<boolean>>([])

const dealSelectItems = computed(() => {
  if (!selectedDeal.value) return dealItems.value
  const has = dealItems.value.some(i => i.value === selectedDeal.value!.value)
  return has ? dealItems.value : [selectedDeal.value, ...dealItems.value]
})

const contactSelectItems = computed(() => {
  if (!selectedContact.value) return contactItems.value
  const has = contactItems.value.some(i => i.value === selectedContact.value!.value)
  return has ? contactItems.value : [selectedContact.value, ...contactItems.value]
})

function onDealSelect(dealId: number | null | undefined) {
  form.deal_id = dealId ?? null
  selectedDeal.value = dealId ? dealItems.value.find(i => i.value === dealId) ?? null : null
}

function onContactSelect(contactId: number | null | undefined) {
  form.contact_id = contactId ?? null
  selectedContact.value = contactId ? contactItems.value.find(i => i.value === contactId) ?? null : null
}

function parseIsoDate(value: string): CalendarDate | null {
  if (!value.trim()) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  return `${value.year}-${m}-${d}`
}

const expiresAt = computed({
  get: () => parseIsoDate(form.expires_at),
  set: (value: CalendarDate | null) => { form.expires_at = formatIsoDate(value) }
})

const expiresAtInput = useTemplateRef('expiresAtInput')
const minExpiresDate = today(getLocalTimeZone())

const statusOptions = computed(() =>
  OFFER_STATUSES.map(value => ({
    label: t(`offerStatus.${value}`),
    value
  }))
)

// Per-option: unit class options and price resolution
interface SitePrice {
  unit_class_rate_id: number | null
  site_id: number
  site_name: string
  price_id: number | null
  amount: string | null
  currency: string | null
  billing_period: string | null
}

function ensureOptionSlots(index: number) {
  while (optionUnitClassItems.value.length <= index) optionUnitClassItems.value.push([])
  while (optionUnitClassLoading.value.length <= index) optionUnitClassLoading.value.push(false)
  while (optionRateResolving.value.length <= index) optionRateResolving.value.push(false)
}

async function onSiteSelect(index: number, siteId: number | null | undefined) {
  const option = form.options[index]
  if (!option) return

  option.site_id = siteId ?? null
  option.unit_class_id = null
  option.unit_class_rate_id = null
  option.resolved_amount = ''
  option.resolved_currency = ''
  option.resolved_billing_period = ''

  ensureOptionSlots(index)
  optionUnitClassItems.value[index] = []

  if (!siteId) return

  optionUnitClassLoading.value[index] = true
  try {
    const response = await get<Array<ApiOption>>(`/api/unit-classes/options?site_id=${siteId}`)
    optionUnitClassItems.value[index] = response.data ?? []
  } finally {
    optionUnitClassLoading.value[index] = false
  }
}

async function onUnitClassSelect(index: number, unitClassId: number | null | undefined) {
  const option = form.options[index]
  if (!option) return

  option.unit_class_id = unitClassId ?? null
  option.unit_class_rate_id = null
  option.resolved_amount = ''
  option.resolved_currency = ''
  option.resolved_billing_period = ''

  if (!unitClassId || !option.site_id) return

  optionRateResolving.value[index] = true
  try {
    const response = await get<Array<SitePrice>>(`/api/unit-classes/${unitClassId}/prices`)
    const prices = response.data ?? []
    const match = prices.find(p => p.site_id === option.site_id && p.unit_class_rate_id !== null)
    if (match) {
      option.unit_class_rate_id = match.unit_class_rate_id
      option.resolved_amount = match.amount ?? ''
      option.resolved_currency = match.currency ?? ''
      option.resolved_billing_period = match.billing_period ?? ''
    }
  } finally {
    optionRateResolving.value[index] = false
  }
}

function formatResolvedPrice(option: OfferOptionForm): string {
  if (!option.resolved_amount) return ''
  const sym = option.resolved_currency === 'GBP' ? '£'
    : option.resolved_currency === 'EUR' ? '€'
    : option.resolved_currency === 'USD' ? '$'
    : option.resolved_currency

  return `${sym}${option.resolved_amount} / ${option.resolved_billing_period}`
}

function handleAddOption() {
  addOption()
  const newIndex = form.options.length - 1
  ensureOptionSlots(newIndex)
}

function handleRemoveOption(index: number) {
  removeOption(index)
  optionUnitClassItems.value.splice(index, 1)
  optionUnitClassLoading.value.splice(index, 1)
  optionRateResolving.value.splice(index, 1)
}

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
    dealSearch.value = ''
    contactSearch.value = ''
    selectedDeal.value = null
    selectedContact.value = null
    optionUnitClassItems.value = []
    optionUnitClassLoading.value = []
    optionRateResolving.value = []
  }
})

async function onSubmit() {
  const savedOffer = await submit()
  if (!savedOffer) return

  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
  emit('saved')
  close()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('forms.offer.createTitle')"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form
        class="flex flex-col gap-5"
        @submit.prevent="onSubmit"
      >
        <!-- Deal -->
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
            :disabled="!!props.initialDealId"
            class="w-full"
            @update:model-value="onDealSelect"
          />
        </UFormField>

        <!-- Contact -->
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
            :disabled="!!props.initialContactId"
            class="w-full"
            @update:model-value="onContactSelect"
          />
        </UFormField>

        <!-- Expires at -->
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

        <!-- Status -->
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

        <!-- Options section -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('forms.offer.options') }}
              <span
                v-if="form.options.length"
                class="ml-1 text-xs text-dimmed"
              >({{ form.options.length }})</span>
            </p>
            <UButton
              type="button"
              icon="i-lucide-plus"
              :label="$t('forms.offer.addOption')"
              color="neutral"
              variant="outline"
              size="sm"
              @click="handleAddOption"
            />
          </div>

          <div
            v-if="!form.options.length"
            class="rounded-lg border border-dashed border-default py-6 text-center text-sm text-dimmed"
          >
            No options yet. Add at least one so contacts can choose.
          </div>

          <UCard
            v-for="(option, index) in form.options"
            :key="index"
          >
            <div class="flex flex-col gap-3">
              <!-- Row header -->
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                  Option {{ index + 1 }}
                </p>
                <UButton
                  type="button"
                  icon="i-lucide-trash-2"
                  :aria-label="$t('forms.offer.removeOption')"
                  color="error"
                  variant="ghost"
                  size="xs"
                  square
                  @click="handleRemoveOption(index)"
                />
              </div>

              <!-- Site + unit class row -->
              <div class="grid grid-cols-2 gap-3">
                <UFormField
                  :label="$t('forms.offer.optionSite')"
                  :name="`options.${index}.site_id`"
                  required
                  :error="fieldError(`options.${index}.site_id`)"
                >
                  <USelect
                    :model-value="option.site_id ?? undefined"
                    :items="siteItems"
                    value-key="value"
                    label-key="label"
                    :placeholder="$t('forms.offer.optionSite')"
                    class="w-full"
                    @update:model-value="(v) => onSiteSelect(index, v)"
                  />
                </UFormField>

                <UFormField
                  :label="$t('forms.offer.optionUnitClass')"
                  :name="`options.${index}.unit_class_id`"
                  required
                  :error="fieldError(`options.${index}.unit_class_id`)"
                >
                  <USelect
                    :model-value="option.unit_class_id ?? undefined"
                    :items="optionUnitClassItems[index] ?? []"
                    value-key="value"
                    label-key="label"
                    :placeholder="optionUnitClassLoading[index] ? 'Loading...' : $t('forms.offer.optionUnitClass')"
                    :disabled="!option.site_id || optionUnitClassLoading[index]"
                    :loading="optionUnitClassLoading[index]"
                    class="w-full"
                    @update:model-value="(v) => onUnitClassSelect(index, v)"
                  />
                </UFormField>
              </div>

              <!-- No unit classes warning -->
              <p
                v-if="option.site_id && !optionUnitClassLoading[index] && (optionUnitClassItems[index] ?? []).length === 0"
                class="text-xs text-warning"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="mr-1 inline size-3.5"
                />
                No unit classes available at this site
              </p>

              <!-- Resolved price badge -->
              <div
                v-if="option.unit_class_rate_id"
                class="flex items-center gap-2"
              >
                <p class="text-xs text-dimmed">
                  {{ $t('forms.offer.optionPrice') }}:
                </p>
                <UBadge
                  :label="formatResolvedPrice(option)"
                  color="success"
                  variant="subtle"
                  size="sm"
                />
              </div>

              <!-- Label -->
              <UFormField
                :label="$t('forms.offer.optionLabel')"
                :name="`options.${index}.label`"
                required
                :error="fieldError(`options.${index}.label`)"
              >
                <UInput
                  v-model="option.label"
                  :placeholder="$t('forms.offer.optionLabel')"
                  class="w-full"
                />
              </UFormField>

              <!-- Description -->
              <UFormField
                :label="$t('forms.offer.optionDescription')"
                :name="`options.${index}.description`"
                :error="fieldError(`options.${index}.description`)"
              >
                <UTextarea
                  v-model="option.description"
                  :rows="2"
                  :placeholder="$t('forms.offer.optionDescription')"
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <!-- Global error -->
        <div
          v-if="error && !Object.keys(fieldErrors).length"
          class="rounded-lg border border-error/30 bg-error/5 p-3"
        >
          <p class="text-sm text-error">
            {{ error }}
          </p>
        </div>

        <!-- Actions -->
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
