<script setup lang="ts">
import type { InlineFieldType, InlineFieldValue } from '~/components/InlineField.vue'
import type { AttributeEntityType } from '~/types/attribute'
import { CONTACT_SOURCES, CONTACT_LIFECYCLE_STATUSES } from '~/types/contact'
import { DEAL_STATUSES, STAY_PERIODS, STORAGE_REASONS } from '~/types/deal'
import { OFFER_STATUSES } from '~/types/offer'
import type { ApiLayoutField } from '~/types/layout'

const props = defineProps<{
  entityType: AttributeEntityType
  entity: Record<string, unknown> & { id: number }
}>()

const emit = defineEmits<{
  nativeSaved: [entity: Record<string, unknown>]
}>()

const { t } = useI18n()
const { patch } = useApi()

const entityId = computed(() => props.entity.id)

const { groups, pending: layoutPending } = useEntityLayout(() => props.entityType)
const {
  valuesByDefinitionId,
  upsert,
  updatingDefinitionId,
  fieldErrors: attributeErrors
} = useEntityAttributes(() => props.entityType, entityId)

const updatingNativeField = ref<string | null>(null)
const nativeFieldErrors = ref<Record<string, string>>({})

const { items: unitClassItems } = useOptions('/api/unit-classes/options')
const { items: siteItems } = useOptions('/api/sites/options')
const { items: unitItems } = useOptions('/api/units/options')

const entityPlural = computed(() => {
  const map: Record<AttributeEntityType, string> = {
    contact: 'contacts',
    deal: 'deals',
    offer: 'offers',
    reservation: 'reservations',
    unit: 'units',
    contract: 'contracts'
  }
  return map[props.entityType]
})

function optionsForSource(source: string | null | undefined) {
  if (!source) {
    return []
  }

  switch (source) {
    case 'deal_statuses':
      return DEAL_STATUSES.map(value => ({
        label: t(`dealStatus.${value}`),
        value
      }))
    case 'stay_periods':
      return STAY_PERIODS.map(value => ({
        label: t(`stayPeriod.${value}`),
        value
      }))
    case 'storage_reasons':
      return STORAGE_REASONS.map(value => ({
        label: t(`storageReason.${value}`),
        value
      }))
    case 'unit_classes':
      return unitClassItems.value.map(item => ({
        label: item.label,
        value: String(item.value)
      }))
    case 'sites':
      return siteItems.value.map(item => ({
        label: item.label,
        value: String(item.value)
      }))
    case 'units':
      return unitItems.value.map(item => ({
        label: item.label,
        value: String(item.value)
      }))
    case 'contact_statuses':
      return CONTACT_LIFECYCLE_STATUSES.map(value => ({
        label: t(`status.contact.${value}`),
        value
      }))
    case 'contact_sources':
      return CONTACT_SOURCES.map(value => ({
        label: t(`contactSource.${value}`),
        value
      }))
    case 'offer_statuses':
      return OFFER_STATUSES.map(value => ({
        label: t(`offerStatus.${value}`),
        value
      }))
    case 'reservation_statuses':
      return ['pending', 'confirmed', 'cancelled', 'expired'].map(value => ({
        label: t(`reservationStatus.${value}`),
        value
      }))
    case 'contract_statuses':
      return ['active', 'moved_out', 'terminated', 'expired'].map(value => ({
        label: t(`contractStatus.${value}`),
        value
      }))
    default:
      return []
  }
}

function nativeRawValue(field: ApiLayoutField): InlineFieldValue {
  const key = field.native_field_key
  if (!key) {
    return null
  }

  const raw = props.entity[key]

  if (raw == null) {
    return null
  }

  if (field.native?.type === 'boolean') {
    return Boolean(raw)
  }

  return String(raw)
}

function nativeDisplayValue(field: ApiLayoutField): string | undefined {
  const key = field.native_field_key
  if (!key) {
    return undefined
  }

  if (key === 'desired_unit_class_id') {
    const related = props.entity.desired_unit_class as { label?: string } | undefined
    return related?.label
  }

  if (key === 'unit_id') {
    const unit = props.entity.unit as { unit_number?: string } | undefined
    if (unit?.unit_number) {
      return unit.unit_number
    }
  }

  if (key === 'site_id') {
    const site = props.entity.site as { name?: string } | undefined
    if (site?.name) {
      return site.name
    }
  }

  if (key === 'unit_class_id') {
    const unitClass = props.entity.unit_class as { label?: string } | undefined
    if (unitClass?.label) {
      return unitClass.label
    }
  }

  if (key === 'desired_size') {
    const size = props.entity.desired_size
    return size != null && size !== '' ? `${size} m²` : undefined
  }

  const source = field.native?.options_source
  const raw = props.entity[key]
  if (source && (typeof raw === 'string' || typeof raw === 'number')) {
    const option = optionsForSource(source).find(item => item.value === String(raw))
    return option?.label
  }

  if (typeof raw === 'string' && raw.includes('T') && field.native?.type === 'date') {
    return raw.slice(0, 10)
  }

  return undefined
}

function attributeRawValue(field: ApiLayoutField): InlineFieldValue {
  const definitionId = field.attribute_definition_id
  if (definitionId == null) {
    return null
  }

  const stored = valuesByDefinitionId.value.get(definitionId)
  if (!stored || stored.value == null) {
    return null
  }

  if (Array.isArray(stored.value)) {
    return stored.value.map(String)
  }

  if (typeof stored.value === 'boolean') {
    return stored.value
  }

  return String(stored.value)
}

function attributeDisplayValue(field: ApiLayoutField): string | undefined {
  const definition = field.attribute_definition
  const definitionId = field.attribute_definition_id
  if (!definition || definitionId == null) {
    return undefined
  }

  const stored = valuesByDefinitionId.value.get(definitionId)
  if (!stored || stored.value == null) {
    return undefined
  }

  if (definition.type === 'select' && typeof stored.value === 'number') {
    return definition.options.find(option => option.id === stored.value)?.label
  }

  if (definition.type === 'multiselect' && Array.isArray(stored.value)) {
    return stored.value
      .map(id => definition.options.find(option => option.id === id)?.label ?? String(id))
      .join(', ')
  }

  if (definition.type === 'boolean') {
    return stored.value === true ? t('common.yes') : stored.value === false ? t('common.no') : undefined
  }

  return undefined
}

function fieldType(field: ApiLayoutField): InlineFieldType {
  if (field.field_type === 'native') {
    const type = field.native?.type ?? 'text'
    if (type === 'email') {
      return 'email'
    }
    return type
  }

  return field.attribute_definition?.type ?? 'text'
}

function fieldOptions(field: ApiLayoutField) {
  if (field.field_type === 'native') {
    return optionsForSource(field.native?.options_source)
  }

  return (field.attribute_definition?.options ?? []).map(option => ({
    label: option.label,
    value: String(option.id)
  }))
}

function fieldLabel(field: ApiLayoutField) {
  if (field.field_type === 'native') {
    return field.native?.label ?? field.native_field_key ?? ''
  }

  return field.attribute_definition?.label ?? ''
}

function isReadonly(field: ApiLayoutField) {
  if (field.field_type === 'native') {
    return !(field.native?.editable ?? true)
  }

  return false
}

function isRequired(field: ApiLayoutField) {
  if (field.field_type === 'native') {
    return field.native?.required ?? false
  }

  return field.attribute_definition?.is_required ?? false
}

function isLoading(field: ApiLayoutField) {
  if (field.field_type === 'native') {
    return updatingNativeField.value === field.native_field_key
  }

  return updatingDefinitionId.value === field.attribute_definition_id
}

function fieldError(field: ApiLayoutField) {
  if (field.field_type === 'native' && field.native_field_key) {
    return nativeFieldErrors.value[field.native_field_key] ?? null
  }

  if (field.attribute_definition_id != null) {
    return attributeErrors.value[String(field.attribute_definition_id)] ?? null
  }

  return null
}

async function onNativeSave(field: ApiLayoutField, value: InlineFieldValue) {
  const key = field.native_field_key
  if (!key) {
    return
  }

  updatingNativeField.value = key
  const { [key]: _, ...rest } = nativeFieldErrors.value
  nativeFieldErrors.value = rest

  let payloadValue: unknown = value
  if (field.native?.type === 'number' && typeof value === 'string') {
    payloadValue = value === '' || value == null ? null : Number(value)
  }

  try {
    const response = await patch<Record<string, unknown>>(
      `/api/${entityPlural.value}/${props.entity.id}`,
      { [key]: payloadValue === '' ? null : payloadValue }
    )
    emit('nativeSaved', response.data)
  } catch (err: unknown) {
    const fetchError = err as {
      data?: {
        message?: string
        errors?: Record<string, Array<string>>
      }
    }
    nativeFieldErrors.value = {
      ...nativeFieldErrors.value,
      [key]: fetchError.data?.errors?.[key]?.[0] ?? fetchError.data?.message ?? t('common.retry')
    }
  } finally {
    updatingNativeField.value = null
  }
}

async function onAttributeSave(field: ApiLayoutField, value: InlineFieldValue) {
  const definitionId = field.attribute_definition_id
  const definition = field.attribute_definition
  if (definitionId == null || !definition) {
    return
  }

  let payload: string | number | boolean | Array<number> | null = null

  if (value == null || value === '') {
    payload = null
  } else if (definition.type === 'boolean') {
    payload = Boolean(value)
  } else if (definition.type === 'number' && typeof value === 'string') {
    payload = Number(value)
  } else if (definition.type === 'select' && typeof value === 'string') {
    payload = Number(value)
  } else if (definition.type === 'multiselect' && Array.isArray(value)) {
    payload = value.map(Number)
  } else if (typeof value === 'string' || typeof value === 'boolean') {
    payload = value
  }

  await upsert(definitionId, payload)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="layoutPending"
      class="flex items-center justify-center py-8"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <UCard
      v-for="group in groups"
      :key="group.id"
    >
      <template #header>
        <h2 class="text-sm font-medium text-dimmed">
          {{ group.label }}
        </h2>
      </template>

      <div class="grid grid-cols-2 gap-x-6 gap-y-5">
        <InlineField
          v-for="field in group.fields"
          :key="field.id"
          :label="fieldLabel(field)"
          :value="field.field_type === 'native' ? nativeRawValue(field) : attributeRawValue(field)"
          :display-value="field.field_type === 'native' ? nativeDisplayValue(field) : attributeDisplayValue(field)"
          :type="fieldType(field)"
          :options="fieldOptions(field)"
          :loading="isLoading(field)"
          :error="fieldError(field)"
          :readonly="isReadonly(field)"
          :required="isRequired(field)"
          :nullable="!isRequired(field)"
          @save="field.field_type === 'native' ? onNativeSave(field, $event) : onAttributeSave(field, $event)"
        />
      </div>
    </UCard>
  </div>
</template>
