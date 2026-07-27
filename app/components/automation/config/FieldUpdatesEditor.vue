<script setup lang="ts">
import type { FieldUpdate, ValueSource } from '~/types/automation'
import type { FilterEntityType } from '~/types/filter'

const props = withDefaults(defineProps<{
  modelValue: Array<FieldUpdate>
  objectType: string
  catalogItems?: Array<{ label: string, value: string }>
  titleKey?: string
  addLabelKey?: string
  emptyKey?: string
}>(), {
  titleKey: 'automations.config.fieldUpdates',
  addLabelKey: 'automations.config.addUpdate',
  emptyKey: 'automations.config.noUpdates'
})

const emit = defineEmits<{
  'update:modelValue': [value: Array<FieldUpdate>]
}>()

const { t } = useI18n()

const FILTER_ENTITY_TYPES = new Set<string>([
  'contact',
  'deal',
  'offer',
  'reservation',
  'unit',
  'contract'
])

const valueKindOptions = computed(() => [
  { label: t('automations.config.valueKindStatic'), value: 'static' },
  { label: t('automations.config.valueKindDynamic'), value: 'dynamic' }
])

const usesFilterSchema = computed(() =>
  !props.catalogItems && FILTER_ENTITY_TYPES.has(props.objectType)
)

const schemaEntityType = computed(() =>
  (usesFilterSchema.value ? props.objectType : 'contact') as FilterEntityType
)

const { fields, pending: schemaPending } = useFilterSchema(schemaEntityType)

const attributeItems = computed(() => {
  if (props.catalogItems) {
    return props.catalogItems
  }
  if (!usesFilterSchema.value) {
    return []
  }
  return fields.value.map(field => ({
    label: field.custom ? `${field.label} (custom)` : field.label,
    value: field.key
  }))
})

const pending = computed(() => (props.catalogItems || !usesFilterSchema.value) ? false : schemaPending.value)

function emitFields(next: Array<FieldUpdate>) {
  emit('update:modelValue', next)
}

function addField() {
  emitFields([
    ...props.modelValue,
    { property: '', value: { kind: 'static', value: '' } }
  ])
}

function removeField(index: number) {
  emitFields(props.modelValue.filter((_, i) => i !== index))
}

function updateFieldProp(index: number, property: string) {
  emitFields(props.modelValue.map((u, i) => i === index ? { ...u, property } : u))
}

function updateFieldValue(index: number, value: ValueSource) {
  emitFields(props.modelValue.map((u, i) => i === index ? { ...u, value } : u))
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-highlighted">{{ $t(titleKey) }}</span>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-plus"
        :label="$t(addLabelKey)"
        @click="addField"
      />
    </div>

    <div
      v-if="modelValue.length === 0"
      class="rounded-lg border border-dashed border-default py-4 text-center text-xs text-dimmed"
    >
      {{ $t(emptyKey) }}
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="(fieldUpdate, idx) in modelValue"
        :key="idx"
        class="rounded-lg border border-default bg-elevated p-3"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs text-dimmed">{{ $t('automations.config.field') }} {{ idx + 1 }}</span>
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            @click="removeField(idx)"
          />
        </div>
        <div class="space-y-1.5">
          <USelectMenu
            :model-value="fieldUpdate.property || undefined"
            :items="attributeItems"
            value-key="value"
            :placeholder="$t('automations.config.propertyPlaceholder')"
            :loading="pending"
            :disabled="!objectType || pending"
            searchable
            class="w-full"
            @update:model-value="updateFieldProp(idx, $event ?? '')"
          />
          <USelectMenu
            :model-value="fieldUpdate.value.kind"
            :items="valueKindOptions"
            value-key="value"
            class="w-full"
            @update:model-value="updateFieldValue(idx, $event === 'dynamic'
              ? { kind: 'dynamic', expression: '' }
              : { kind: 'static', value: '' })"
          />
          <UInput
            v-if="fieldUpdate.value.kind === 'static'"
            :model-value="String(fieldUpdate.value.value ?? '')"
            :placeholder="$t('automations.config.valuePlaceholder')"
            class="w-full"
            @update:model-value="updateFieldValue(idx, { kind: 'static', value: $event })"
          />
          <UInput
            v-else
            :model-value="fieldUpdate.value.expression"
            placeholder="{{trigger.contact.status}}"
            class="w-full font-mono"
            @update:model-value="updateFieldValue(idx, { kind: 'dynamic', expression: $event })"
          />
        </div>
      </div>
    </div>
  </div>
</template>
