<script setup lang="ts">
import type { ObjectCreationTriggerConfig, FilterCondition, FilterGroup, FilterOperator } from '~/types/automation'

const props = defineProps<{
  config: ObjectCreationTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: ObjectCreationTriggerConfig]
}>()

const { items: objectTypeOptions } = useTriggerObjectTypeOptions(true)

const operatorOptions: Array<{ label: string, value: FilterOperator }> = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not contains', value: 'not_contains' },
  { label: 'Is empty', value: 'is_empty' },
  { label: 'Is not empty', value: 'is_not_empty' },
  { label: 'Greater than', value: 'greater_than' },
  { label: 'Less than', value: 'less_than' }
]

const logicOptions = [
  { label: 'All conditions match (AND)', value: 'and' },
  { label: 'Any condition matches (OR)', value: 'or' }
]

const requiresValue: Array<FilterOperator> = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than'
]

const objectType = computed(() => props.config.objectType)
const { fields, pending: schemaPending } = useTriggerFieldSchema(objectType)

const fieldItems = computed(() =>
  fields.value.map(field => ({
    label: field.custom ? `${field.label} (custom)` : field.label,
    value: field.key
  }))
)

function fieldMeta(fieldKey: string) {
  return fields.value.find(field => field.key === fieldKey)
}

function selectItemsFor(fieldKey: string) {
  return (fieldMeta(fieldKey)?.options ?? []).map(option => ({
    label: option.label,
    value: option.value
  }))
}

function update(patch: Partial<ObjectCreationTriggerConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function onObjectTypeChange(next: string) {
  emit('update:config', {
    ...props.config,
    objectType: next,
    filters: {
      ...props.config.filters,
      conditions: props.config.filters.conditions.map((c) => {
        if (!('field' in c)) {
          return c
        }
        return { ...c, field: '' }
      })
    }
  })
}

function addFilter() {
  const condition: FilterCondition = { field: '', operator: 'equals', value: '' }
  emit('update:config', {
    ...props.config,
    filters: {
      ...props.config.filters,
      conditions: [...props.config.filters.conditions, condition]
    }
  })
}

function removeFilter(index: number) {
  emit('update:config', {
    ...props.config,
    filters: {
      ...props.config.filters,
      conditions: props.config.filters.conditions.filter((_, i) => i !== index)
    }
  })
}

function updateFilter(index: number, patch: Partial<FilterCondition>) {
  const conditions = props.config.filters.conditions.map((c, i) =>
    i === index ? { ...c, ...patch } : c
  )
  emit('update:config', {
    ...props.config,
    filters: { ...props.config.filters, conditions }
  })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.objectType')">
      <USelectMenu
        :model-value="config.objectType"
        :items="objectTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="onObjectTypeChange($event)"
      />
    </UFormField>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-highlighted">{{ $t('automations.config.filters') }}</span>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-plus"
          :label="$t('automations.config.addFilter')"
          @click="addFilter"
        />
      </div>

      <USelectMenu
        v-if="config.filters.conditions.length > 1"
        :model-value="config.filters.logic"
        :items="logicOptions"
        value-key="value"
        class="mb-2 w-full"
        @update:model-value="update({ filters: { ...config.filters, logic: $event as FilterGroup['logic'] } })"
      />

      <div
        v-if="config.filters.conditions.length === 0"
        class="rounded-lg border border-dashed border-default py-4 text-center text-xs text-dimmed"
      >
        {{ $t('automations.config.noFilters') }}
      </div>

      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="(condition, idx) in config.filters.conditions"
          :key="idx"
          class="rounded-lg border border-default bg-elevated p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-dimmed">{{ $t('automations.config.filter') }} {{ idx + 1 }}</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="removeFilter(idx)"
            />
          </div>
          <div class="space-y-1.5">
            <USelectMenu
              v-if="fieldItems.length > 0"
              :model-value="(condition as FilterCondition).field || undefined"
              :items="fieldItems"
              value-key="value"
              :placeholder="$t('automations.config.fieldPlaceholder')"
              :loading="schemaPending"
              searchable
              class="w-full"
              @update:model-value="updateFilter(idx, { field: $event ?? '' })"
            />
            <UInput
              v-else
              :model-value="(condition as FilterCondition).field"
              :placeholder="$t('automations.config.fieldPlaceholder')"
              class="w-full"
              @update:model-value="updateFilter(idx, { field: $event })"
            />
            <USelectMenu
              :model-value="(condition as FilterCondition).operator"
              :items="operatorOptions"
              value-key="value"
              class="w-full"
              @update:model-value="updateFilter(idx, { operator: $event })"
            />
            <template v-if="requiresValue.includes((condition as FilterCondition).operator)">
              <USelectMenu
                v-if="fieldMeta((condition as FilterCondition).field)?.type === 'select'"
                :model-value="(condition as FilterCondition).value"
                :items="selectItemsFor((condition as FilterCondition).field)"
                value-key="value"
                :placeholder="$t('automations.config.valuePlaceholder')"
                class="w-full"
                @update:model-value="updateFilter(idx, { value: $event })"
              />
              <UInput
                v-else
                :model-value="String((condition as FilterCondition).value ?? '')"
                :placeholder="$t('automations.config.valuePlaceholder')"
                class="w-full"
                @update:model-value="updateFilter(idx, { value: $event })"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
