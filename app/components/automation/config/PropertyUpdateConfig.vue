<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { PropertyUpdateTriggerConfig, FilterOperator } from '~/types/automation'

const props = defineProps<{
  config: PropertyUpdateTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: PropertyUpdateTriggerConfig]
}>()

const { items: objectTypeOptions } = useTriggerObjectTypeOptions(false)

const operatorOptions: Array<{ label: string, value: FilterOperator }> = [
  { label: 'Changed', value: 'changed' },
  { label: 'Equals', value: 'equals' },
  { label: 'Not equals', value: 'not_equals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Not contains', value: 'not_contains' },
  { label: 'Is empty', value: 'is_empty' },
  { label: 'Is not empty', value: 'is_not_empty' }
]

const requiresValue: Array<FilterOperator> = ['equals', 'not_equals', 'contains', 'not_contains']

const objectType = computed(() => props.config.objectType)
const { fields, pending: schemaPending } = useTriggerFieldSchema(objectType)

const attributeItems = computed(() =>
  fields.value.map(field => ({
    label: field.custom ? `${field.label} (custom)` : field.label,
    value: field.key,
  })),
)

const selectedAttribute = computed(() =>
  fields.value.find(field => field.key === props.config.property),
)

const selectItems = computed(() =>
  (selectedAttribute.value?.options ?? []).map(option => ({
    label: option.label,
    value: option.value,
  })),
)

const dateInputRefs = ref<Record<number, { inputsRef?: Array<{ $el?: HTMLElement }> } | null>>({})

function setDateInputRef(idx: number, el: unknown) {
  if (el) {
    dateInputRefs.value[idx] = el as { inputsRef?: Array<{ $el?: HTMLElement }> }
  } else {
    delete dateInputRefs.value[idx]
  }
}

function parseIsoDate(value: unknown): CalendarDate | null {
  if (typeof value !== 'string' || !value.trim()) {
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

  const m = String(value.month).padStart(2, '0')
  const d = String(value.day).padStart(2, '0')
  return `${value.year}-${m}-${d}`
}

function clearConditionValues(conditions: PropertyUpdateTriggerConfig['conditions']) {
  return conditions.map(({ operator }) => ({ operator }))
}

function onObjectTypeChange(objectType: string) {
  emit('update:config', {
    ...props.config,
    objectType,
    property: '',
    conditions: clearConditionValues(props.config.conditions),
  })
}

function onPropertyChange(property: string) {
  emit('update:config', {
    ...props.config,
    property: property ?? '',
    conditions: clearConditionValues(props.config.conditions),
  })
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

function conditionDateValue(value: unknown): CalendarDate | null {
  return parseIsoDate(value)
}

function setConditionDateValue(index: number, value: CalendarDate | null) {
  updateCondition(index, { value: formatIsoDate(value) || undefined })
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

    <UFormField :label="$t('automations.config.property')">
      <USelectMenu
        :model-value="config.property || undefined"
        :items="attributeItems"
        value-key="value"
        :placeholder="$t('automations.config.propertyPlaceholder')"
        :loading="schemaPending"
        :disabled="!config.objectType || schemaPending"
        searchable
        class="w-full"
        @update:model-value="onPropertyChange($event ?? '')"
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
            <USelectMenu
              :model-value="condition.operator"
              :items="operatorOptions"
              value-key="value"
              class="w-full"
              @update:model-value="updateCondition(idx, { operator: $event })"
            />

            <template v-if="requiresValue.includes(condition.operator)">
              <USelectMenu
                v-if="selectedAttribute?.type === 'select' || selectedAttribute?.type === 'boolean'"
                :model-value="condition.value"
                :items="selectItems"
                value-key="value"
                :placeholder="$t('automations.config.valuePlaceholder')"
                class="w-full"
                @update:model-value="updateCondition(idx, { value: $event })"
              />

              <UInput
                v-else-if="selectedAttribute?.type === 'number'"
                :model-value="condition.value == null ? '' : String(condition.value)"
                type="number"
                :placeholder="$t('automations.config.valuePlaceholder')"
                class="w-full"
                @update:model-value="updateCondition(idx, {
                  value: $event === '' || $event == null ? undefined : Number($event),
                })"
              />

              <UInputDate
                v-else-if="selectedAttribute?.type === 'date'"
                :ref="(el) => setDateInputRef(idx, el)"
                :model-value="conditionDateValue(condition.value)"
                class="w-full"
                @update:model-value="setConditionDateValue(idx, $event)"
              >
                <template #trailing>
                  <UPopover :reference="dateInputRefs[idx]?.inputsRef?.[3]?.$el">
                    <UButton
                      color="neutral"
                      variant="link"
                      size="sm"
                      icon="i-lucide-calendar"
                      :aria-label="$t('filters.selectDate')"
                      class="px-0"
                    />
                    <template #content>
                      <UCalendar
                        :model-value="conditionDateValue(condition.value)"
                        class="p-2"
                        @update:model-value="setConditionDateValue(idx, $event)"
                      />
                    </template>
                  </UPopover>
                </template>
              </UInputDate>

              <UInput
                v-else
                :model-value="String(condition.value ?? '')"
                :placeholder="$t('automations.config.valuePlaceholder')"
                class="w-full"
                @update:model-value="updateCondition(idx, { value: $event })"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
