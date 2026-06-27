<script setup lang="ts">
import type { PropertyUpdateTriggerConfig, FilterOperator } from '~/types/automation'

const props = defineProps<{
  config: PropertyUpdateTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: PropertyUpdateTriggerConfig]
}>()

const { t } = useI18n()

const objectTypeOptions = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Unit', value: 'unit' },
  { label: 'Contract', value: 'contract' },
  { label: 'Reservation', value: 'reservation' },
]

const operatorOptions: Array<{ label: string; value: FilterOperator }> = [
  { label: 'Changed', value: 'changed' },
  { label: 'Equals', value: 'equals' },
  { label: 'Not equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not contains', value: 'not_contains' },
  { label: 'Is empty', value: 'is_empty' },
  { label: 'Is not empty', value: 'is_not_empty' },
]

const requiresValue: Array<FilterOperator> = ['equals', 'not_equals', 'contains', 'not_contains']

function update(patch: Partial<PropertyUpdateTriggerConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function addCondition() {
  emit('update:config', {
    ...props.config,
    conditions: [...props.config.conditions, { operator: 'changed' }],
  })
}

function removeCondition(index: number) {
  emit('update:config', {
    ...props.config,
    conditions: props.config.conditions.filter((_, i) => i !== index),
  })
}

function updateCondition(index: number, patch: Partial<PropertyUpdateTriggerConfig['conditions'][number]>) {
  const conditions = props.config.conditions.map((c, i) => i === index ? { ...c, ...patch } : c)
  emit('update:config', { ...props.config, conditions })
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

    <UFormField :label="$t('automations.config.property')">
      <UInput
        :model-value="config.property"
        :placeholder="$t('automations.config.propertyPlaceholder')"
        class="w-full"
        @update:model-value="update({ property: $event })"
      />
    </UFormField>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-highlighted">{{ $t('automations.config.conditions') }}</span>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-plus"
          :label="$t('automations.config.addCondition')"
          @click="addCondition"
        />
      </div>

      <div
        v-if="config.conditions.length === 0"
        class="rounded-lg border border-dashed border-default py-4 text-center text-xs text-dimmed"
      >
        {{ $t('automations.config.noConditions') }}
      </div>

      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="(condition, idx) in config.conditions"
          :key="idx"
          class="rounded-lg border border-default bg-elevated p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs font-medium text-dimmed">{{ $t('automations.config.condition') }} {{ idx + 1 }}</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="removeCondition(idx)"
            />
          </div>

          <div class="space-y-2">
            <USelect
              :model-value="condition.operator"
              :options="operatorOptions"
              value-key="value"
              class="w-full"
              @update:model-value="updateCondition(idx, { operator: $event })"
            />
            <UInput
              v-if="requiresValue.includes(condition.operator)"
              :model-value="String(condition.value ?? '')"
              :placeholder="$t('automations.config.valuePlaceholder')"
              class="w-full"
              @update:model-value="updateCondition(idx, { value: $event })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
