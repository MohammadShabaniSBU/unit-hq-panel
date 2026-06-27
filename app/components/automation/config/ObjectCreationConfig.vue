<script setup lang="ts">
import type { ObjectCreationTriggerConfig, FilterCondition, FilterOperator } from '~/types/automation'

const props = defineProps<{
  config: ObjectCreationTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: ObjectCreationTriggerConfig]
}>()

const objectTypeOptions = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Unit', value: 'unit' },
  { label: 'Contract', value: 'contract' },
  { label: 'Reservation', value: 'reservation' },
]

const operatorOptions: Array<{ label: string; value: FilterOperator }> = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not contains', value: 'not_contains' },
  { label: 'Is empty', value: 'is_empty' },
  { label: 'Is not empty', value: 'is_not_empty' },
]

const logicOptions = [
  { label: 'All conditions match (AND)', value: 'and' },
  { label: 'Any condition matches (OR)', value: 'or' },
]

const requiresValue: Array<FilterOperator> = ['equals', 'not_equals', 'contains', 'not_contains']

function update(patch: Partial<ObjectCreationTriggerConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function addFilter() {
  const condition: FilterCondition = { field: '', operator: 'equals', value: '' }
  emit('update:config', {
    ...props.config,
    filters: {
      ...props.config.filters,
      conditions: [...props.config.filters.conditions, condition],
    },
  })
}

function removeFilter(index: number) {
  emit('update:config', {
    ...props.config,
    filters: {
      ...props.config.filters,
      conditions: props.config.filters.conditions.filter((_, i) => i !== index),
    },
  })
}

function updateFilter(index: number, patch: Partial<FilterCondition>) {
  const conditions = props.config.filters.conditions.map((c, i) =>
    i === index ? { ...c, ...patch } : c,
  )
  emit('update:config', {
    ...props.config,
    filters: { ...props.config.filters, conditions },
  })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.objectType')">
      <USelect
        :model-value="config.objectType"
        :options="objectTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ objectType: $event })"
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

      <USelect
        v-if="config.filters.conditions.length > 1"
        :model-value="config.filters.logic"
        :options="logicOptions"
        value-key="value"
        class="mb-2 w-full"
        @update:model-value="update({ filters: { ...config.filters, logic: $event } })"
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
            <UInput
              :model-value="(condition as FilterCondition).field"
              :placeholder="$t('automations.config.fieldPlaceholder')"
              class="w-full"
              @update:model-value="updateFilter(idx, { field: $event })"
            />
            <USelect
              :model-value="(condition as FilterCondition).operator"
              :options="operatorOptions"
              value-key="value"
              class="w-full"
              @update:model-value="updateFilter(idx, { operator: $event })"
            />
            <UInput
              v-if="requiresValue.includes((condition as FilterCondition).operator)"
              :model-value="String((condition as FilterCondition).value ?? '')"
              :placeholder="$t('automations.config.valuePlaceholder')"
              class="w-full"
              @update:model-value="updateFilter(idx, { value: $event })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
