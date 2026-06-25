<script setup lang="ts">
import type { ApiOption } from '~/types/facility'
import type { ApiOfferOption } from '~/types/offer'

interface SitePrice {
  unit_class_rate_id: number | null
  site_id: number
  site_name: string
  price_id: number | null
  amount: string | null
  currency: string | null
  billing_period: string | null
}

interface OptionDraft {
  label: string
  description: string
  display_order: number
  site_id: number | null
  unit_class_id: number | null
  unit_class_rate_id: number | null
  resolved_amount: string
  resolved_currency: string
  resolved_billing_period: string
  resolved_site_name: string
  resolved_unit_class_label: string
}

const props = withDefaults(defineProps<{
  option: ApiOfferOption | null
  offerId: number
  defaultDisplayOrder?: number
}>(), {
  defaultDisplayOrder: 0
})

const emit = defineEmits<{
  updated: [ApiOfferOption]
  deleted: [number]
  created: [ApiOfferOption]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()
const { items: siteItems } = useOptions('/api/sites/options')
const { loading, fieldErrors, createOption, updateOption, deleteOption } = useOfferOptionUpdate()

const isNew = computed(() => props.option === null)
const isEditing = ref(isNew.value)

const unitClassItems = ref<Array<ApiOption>>([])
const unitClassLoading = ref(false)
const rateResolving = ref(false)

const draft = reactive<OptionDraft>({
  label: '',
  description: '',
  display_order: 0,
  site_id: null,
  unit_class_id: null,
  unit_class_rate_id: null,
  resolved_amount: '',
  resolved_currency: '',
  resolved_billing_period: '',
  resolved_site_name: '',
  resolved_unit_class_label: ''
})

function fieldError(name: string) {
  return fieldErrors.value[name]?.[0]
}

function formatPrice(price: { amount: string; currency: string; billing_period: string }) {
  const sym = price.currency === 'GBP' ? '£' : price.currency === 'EUR' ? '€' : price.currency === 'USD' ? '$' : price.currency
  return `${sym}${price.amount} / ${price.billing_period}`
}

function siteUnitClassSummary(option: ApiOfferOption): string {
  const site = option.unit_class_rate?.site?.name
  const unitClass = option.unit_class_rate?.unit_class?.label

  if (site && unitClass) {
    return `${site} · ${unitClass}`
  }

  return site ?? unitClass ?? ''
}

function formatResolvedPrice(): string {
  if (!draft.resolved_amount) return ''
  const sym = draft.resolved_currency === 'GBP' ? '£'
    : draft.resolved_currency === 'EUR' ? '€'
    : draft.resolved_currency === 'USD' ? '$'
    : draft.resolved_currency

  return `${sym}${draft.resolved_amount} / ${draft.resolved_billing_period}`
}

function resetDraftFromOption(option: ApiOfferOption) {
  draft.label = option.label
  draft.description = option.description ?? ''
  draft.display_order = option.display_order
  draft.site_id = option.unit_class_rate?.site?.id ?? option.unit_class_rate?.site_id ?? null
  draft.unit_class_id = option.unit_class_rate?.unit_class?.id ?? option.unit_class_rate?.unit_class_id ?? null
  draft.unit_class_rate_id = option.unit_class_rate_id
  draft.resolved_amount = option.unit_class_rate?.price?.amount ?? ''
  draft.resolved_currency = option.unit_class_rate?.price?.currency ?? ''
  draft.resolved_billing_period = option.unit_class_rate?.price?.billing_period ?? ''
  draft.resolved_site_name = option.unit_class_rate?.site?.name ?? ''
  draft.resolved_unit_class_label = option.unit_class_rate?.unit_class?.label ?? ''
}

function resetDraftForCreate(displayOrder: number) {
  draft.label = ''
  draft.description = ''
  draft.display_order = displayOrder
  draft.site_id = null
  draft.unit_class_id = null
  draft.unit_class_rate_id = null
  draft.resolved_amount = ''
  draft.resolved_currency = ''
  draft.resolved_billing_period = ''
  draft.resolved_site_name = ''
  draft.resolved_unit_class_label = ''
  unitClassItems.value = []
}

async function loadUnitClasses(siteId: number) {
  unitClassLoading.value = true
  try {
    const response = await get<Array<ApiOption>>(`/api/unit-classes/options?site_id=${siteId}`)
    unitClassItems.value = response.data ?? []
  } finally {
    unitClassLoading.value = false
  }
}

async function onSiteSelect(siteId: number | null | undefined) {
  draft.site_id = siteId ?? null
  draft.unit_class_id = null
  draft.unit_class_rate_id = null
  draft.resolved_amount = ''
  draft.resolved_currency = ''
  draft.resolved_billing_period = ''
  draft.resolved_site_name = siteItems.value.find(item => item.value === siteId)?.label ?? ''
  draft.resolved_unit_class_label = ''
  unitClassItems.value = []

  if (!siteId) return
  await loadUnitClasses(siteId)
}

async function onUnitClassSelect(unitClassId: number | null | undefined) {
  draft.unit_class_id = unitClassId ?? null
  draft.unit_class_rate_id = null
  draft.resolved_amount = ''
  draft.resolved_currency = ''
  draft.resolved_billing_period = ''
  draft.resolved_unit_class_label = unitClassItems.value.find(item => item.value === unitClassId)?.label ?? ''

  if (!unitClassId || !draft.site_id) return

  rateResolving.value = true
  try {
    const response = await get<Array<SitePrice>>(`/api/unit-classes/${unitClassId}/prices`)
    const prices = response.data ?? []
    const match = prices.find(price => price.site_id === draft.site_id && price.unit_class_rate_id !== null)
    if (match) {
      draft.unit_class_rate_id = match.unit_class_rate_id
      draft.resolved_amount = match.amount ?? ''
      draft.resolved_currency = match.currency ?? ''
      draft.resolved_billing_period = match.billing_period ?? ''
      if (match.site_name) {
        draft.resolved_site_name = match.site_name
      }
    }
  } finally {
    rateResolving.value = false
  }
}

function ensureUnitClassInItems() {
  if (!draft.unit_class_id || !draft.resolved_unit_class_label) return

  const exists = unitClassItems.value.some(item => item.value === draft.unit_class_id)
  if (exists) return

  unitClassItems.value = [
    { value: draft.unit_class_id, label: draft.resolved_unit_class_label },
    ...unitClassItems.value
  ]
}

async function startEditing() {
  if (!props.option) return

  resetDraftFromOption(props.option)
  isEditing.value = true

  if (draft.site_id) {
    await loadUnitClasses(draft.site_id)
    ensureUnitClassInItems()
  }
}

function cancelEditing() {
  if (isNew.value) {
    emit('cancel')
    return
  }

  isEditing.value = false
}

async function onSave() {
  if (!draft.label.trim() || !draft.unit_class_rate_id) return

  const payload = {
    label: draft.label.trim(),
    description: draft.description.trim() || null,
    display_order: draft.display_order,
    unit_class_rate_id: draft.unit_class_rate_id
  }

  if (isNew.value) {
    const { data, error } = await createOption({
      offer_id: props.offerId,
      ...payload
    })

    if (error || !data) {
      toast.add({ title: error ?? t('forms.offer.createErrorMessage'), color: 'error' })
      return
    }

    emit('created', data)
    toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
    return
  }

  if (!props.option) return

  const { data, error } = await updateOption(props.option.id, payload)

  if (error || !data) {
    toast.add({ title: error ?? t('forms.offer.createErrorMessage'), color: 'error' })
    return
  }

  isEditing.value = false
  emit('updated', data)
  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
}

async function onDelete() {
  if (!props.option) return

  const { error } = await deleteOption(props.option.id)

  if (error) {
    toast.add({ title: error, color: 'error' })
    return
  }

  emit('deleted', props.option.id)
  toast.add({ title: t('forms.offer.createSuccessMessage'), color: 'success' })
}

watch(
  () => [props.option, props.defaultDisplayOrder] as const,
  ([option, defaultDisplayOrder]) => {
    if (isNew.value) {
      resetDraftForCreate(defaultDisplayOrder)
      isEditing.value = true
      return
    }

    if (!isEditing.value && option) {
      resetDraftFromOption(option)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-default p-3">
    <!-- View mode -->
    <template v-if="!isEditing && option">
      <div class="flex items-start justify-between gap-3">
        <p class="min-w-0 shrink text-sm font-medium text-highlighted">
          {{ option.label }}
        </p>

        <p
          v-if="siteUnitClassSummary(option)"
          class="min-w-0 flex-1 truncate text-center text-xs text-dimmed"
        >
          {{ siteUnitClassSummary(option) }}
        </p>

        <div class="flex shrink-0 items-center gap-1">
          <UBadge
            v-if="option.selected_at"
            label="Selected"
            color="success"
            variant="subtle"
            size="sm"
          />
          <UButton
            icon="i-lucide-pencil"
            :aria-label="$t('forms.offer.save')"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :disabled="loading"
            @click="startEditing"
          />
          <UButton
            icon="i-lucide-trash-2"
            :aria-label="$t('forms.offer.removeOption')"
            color="error"
            variant="ghost"
            size="xs"
            square
            :loading="loading"
            @click="onDelete"
          />
        </div>
      </div>

      <p
        v-if="option.description"
        class="text-xs text-dimmed"
      >
        {{ option.description }}
      </p>

      <p
        v-if="option.unit_class_rate?.price"
        class="text-xs font-medium text-highlighted"
      >
        {{ formatPrice(option.unit_class_rate.price) }}
      </p>
    </template>

    <!-- Edit / create mode -->
    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
          {{ isNew ? $t('forms.offer.addOption') : option?.label }}
        </p>
        <UButton
          v-if="!isNew"
          icon="i-lucide-trash-2"
          :aria-label="$t('forms.offer.removeOption')"
          color="error"
          variant="ghost"
          size="xs"
          square
          :loading="loading"
          @click="onDelete"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <UFormField
          :label="$t('forms.offer.optionSite')"
          :name="isNew ? 'new_option.site_id' : `options.${option?.id}.site_id`"
          required
          :error="fieldError(isNew ? 'site_id' : 'site_id')"
        >
          <USelect
            :model-value="draft.site_id ?? undefined"
            :items="siteItems"
            value-key="value"
            label-key="label"
            :placeholder="$t('forms.offer.optionSite')"
            class="w-full"
            @update:model-value="onSiteSelect"
          />
        </UFormField>

        <UFormField
          :label="$t('forms.offer.optionUnitClass')"
          :name="isNew ? 'new_option.unit_class_id' : `options.${option?.id}.unit_class_id`"
          required
          :error="fieldError('unit_class_id')"
        >
          <USelect
            :model-value="draft.unit_class_id ?? undefined"
            :items="unitClassItems"
            value-key="value"
            label-key="label"
            :placeholder="unitClassLoading ? 'Loading...' : $t('forms.offer.optionUnitClass')"
            :disabled="!draft.site_id || unitClassLoading"
            :loading="unitClassLoading || rateResolving"
            class="w-full"
            @update:model-value="onUnitClassSelect"
          />
        </UFormField>
      </div>

      <p
        v-if="draft.site_id && !unitClassLoading && unitClassItems.length === 0"
        class="text-xs text-warning"
      >
        <UIcon
          name="i-lucide-alert-triangle"
          class="mr-1 inline size-3.5"
        />
        No unit classes available at this site
      </p>

      <div
        v-if="draft.unit_class_rate_id"
        class="flex items-center gap-2"
      >
        <p class="text-xs text-dimmed">
          {{ $t('forms.offer.optionPrice') }}:
        </p>
        <UBadge
          :label="formatResolvedPrice()"
          color="success"
          variant="subtle"
          size="sm"
        />
      </div>

      <UFormField
        :label="$t('forms.offer.optionLabel')"
        :name="isNew ? 'new_option.label' : `options.${option?.id}.label`"
        required
        :error="fieldError('label')"
      >
        <UInput
          v-model="draft.label"
          :placeholder="$t('forms.offer.optionLabel')"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="$t('forms.offer.optionDescription')"
        :name="isNew ? 'new_option.description' : `options.${option?.id}.description`"
        :error="fieldError('description')"
      >
        <UTextarea
          v-model="draft.description"
          :rows="2"
          :placeholder="$t('forms.offer.optionDescription')"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Display order"
        :name="isNew ? 'new_option.display_order' : `options.${option?.id}.display_order`"
        :error="fieldError('display_order')"
      >
        <UInput
          v-model.number="draft.display_order"
          type="number"
          min="0"
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-end gap-2 pt-1">
        <UButton
          type="button"
          :label="$t('forms.offer.cancel')"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="cancelEditing"
        />
        <UButton
          type="button"
          :label="$t('forms.offer.save')"
          color="primary"
          size="sm"
          :loading="loading"
          :disabled="!draft.label.trim() || !draft.unit_class_rate_id"
          @click="onSave"
        />
      </div>
    </template>
  </div>
</template>
