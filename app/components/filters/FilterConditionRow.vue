<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { FilterOperator, FilterSchemaField } from '~/types/filter'

const props = defineProps<{
  fields: Array<FilterSchemaField>
}>()

const condition = defineModel<{
  field: string
  op: FilterOperator
  value: unknown
}>('condition', { required: true })

const emit = defineEmits<{
  remove: []
}>()

const { t } = useI18n()

const dateInput = useTemplateRef('dateInput')
const betweenStartInput = useTemplateRef('betweenStartInput')
const betweenEndInput = useTemplateRef('betweenEndInput')

const selectedField = computed(() =>
  props.fields.find(field => field.key === condition.value.field)
)

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

const fieldItems = computed(() =>
  props.fields.map(field => ({
    label: field.label,
    value: field.key,
    suffix: field.custom ? t('filters.customPill') : undefined
  }))
)

const operatorItems = computed(() => {
  const operators = selectedField.value?.operators ?? ['eq']

  return operators.map(op => ({
    label: t(`filters.operators.${op}`),
    value: op
  }))
})

const selectItems = computed(() =>
  (selectedField.value?.options ?? []).map(option => ({
    label: option.label,
    value: option.value
  }))
)

watch(
  () => condition.value.field,
  (key, previous) => {
    if (!key || key === previous) {
      return
    }

    const field = props.fields.find(item => item.key === key)
    if (!field) {
      return
    }

    if (!field.operators.includes(condition.value.op)) {
      condition.value.op = field.operators[0] ?? 'eq'
    }

    condition.value.value = condition.value.op === 'is_empty'
      ? null
      : defaultValueFor(field, condition.value.op)
  }
)

watch(
  () => condition.value.op,
  (op) => {
    if (op === 'is_empty') {
      condition.value.value = null
      return
    }

    const field = selectedField.value
    if (!field) {
      return
    }

    condition.value.value = defaultValueFor(field, op)
  }
)

function defaultValueFor(field: FilterSchemaField, op: FilterOperator): unknown {
  if (op === 'between') {
    return [null, null]
  }

  if (['in', 'any_of', 'all_of', 'none_of'].includes(op)) {
    return []
  }

  if (field.type === 'boolean') {
    return true
  }

  if (field.type === 'number' || field.type === 'select' || field.type === 'multiselect') {
    return field.options?.[0]?.value ?? null
  }

  return ''
}

const betweenValue = computed<[string | null, string | null]>({
  get: () => {
    const value = condition.value.value
    if (Array.isArray(value) && value.length === 2) {
      return [value[0] == null ? null : String(value[0]), value[1] == null ? null : String(value[1])]
    }

    return [null, null]
  },
  set: (next) => {
    condition.value.value = next
  }
})

const multiValue = computed<Array<string | number | boolean>>({
  get: () => (Array.isArray(condition.value.value) ? condition.value.value as Array<string | number | boolean> : []),
  set: (next) => {
    condition.value.value = next
  }
})

const dateValue = computed<CalendarDate | null>({
  get: () => parseIsoDate(condition.value.value),
  set: (value) => {
    condition.value.value = formatIsoDate(value)
  }
})

const betweenStartDate = computed<CalendarDate | null>({
  get: () => parseIsoDate(betweenValue.value[0]),
  set: (value) => {
    betweenValue.value = [value ? formatIsoDate(value) : null, betweenValue.value[1]]
  }
})

const betweenEndDate = computed<CalendarDate | null>({
  get: () => parseIsoDate(betweenValue.value[1]),
  set: (value) => {
    betweenValue.value = [betweenValue.value[0], value ? formatIsoDate(value) : null]
  }
})
</script>

<template>
  <div class="flex items-start gap-2 rounded-lg border border-default bg-default p-2">
    <div class="grid min-w-0 flex-1 gap-2">
      <USelectMenu
        v-model="condition.field"
        :items="fieldItems"
        value-key="value"
        :placeholder="$t('filters.fieldPlaceholder')"
        searchable
        class="w-full"
      />

      <USelect
        v-model="condition.op"
        :items="operatorItems"
        value-key="value"
        class="w-full"
      />

      <div
        v-if="condition.op !== 'is_empty'"
        class="min-w-0"
      >
        <template v-if="condition.op === 'between' && selectedField?.type === 'date'">
          <div class="grid gap-2">
            <UInputDate
              ref="betweenStartInput"
              v-model="betweenStartDate"
              class="w-full"
            >
              <template #trailing>
                <UPopover :reference="betweenStartInput?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    :aria-label="$t('filters.betweenFrom')"
                    class="px-0"
                  />
                  <template #content>
                    <UCalendar
                      v-model="betweenStartDate"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
            <UInputDate
              ref="betweenEndInput"
              v-model="betweenEndDate"
              class="w-full"
            >
              <template #trailing>
                <UPopover :reference="betweenEndInput?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    :aria-label="$t('filters.betweenTo')"
                    class="px-0"
                  />
                  <template #content>
                    <UCalendar
                      v-model="betweenEndDate"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
          </div>
        </template>

        <template v-else-if="condition.op === 'between'">
          <div class="flex gap-1">
            <UInput
              :model-value="betweenValue[0] ?? ''"
              :type="selectedField?.type === 'number' ? 'number' : 'text'"
              class="w-full"
              @update:model-value="(v) => { betweenValue = [String(v || ''), betweenValue[1]] }"
            />
            <UInput
              :model-value="betweenValue[1] ?? ''"
              :type="selectedField?.type === 'number' ? 'number' : 'text'"
              class="w-full"
              @update:model-value="(v) => { betweenValue = [betweenValue[0], String(v || '')] }"
            />
          </div>
        </template>

        <USelectMenu
          v-else-if="['in', 'any_of', 'all_of', 'none_of'].includes(condition.op)"
          v-model="multiValue"
          :items="selectItems"
          value-key="value"
          multiple
          searchable
          class="w-full"
        />

        <USelect
          v-else-if="selectedField?.type === 'select' || selectedField?.type === 'boolean'"
          v-model="condition.value"
          :items="selectItems"
          value-key="value"
          class="w-full"
        />

        <UInput
          v-else-if="selectedField?.type === 'number'"
          v-model.number="condition.value"
          type="number"
          class="w-full"
        />

        <UInputDate
          v-else-if="selectedField?.type === 'date'"
          ref="dateInput"
          v-model="dateValue"
          class="w-full"
        >
          <template #trailing>
            <UPopover :reference="dateInput?.inputsRef[3]?.$el">
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
                  v-model="dateValue"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>

        <UInput
          v-else
          v-model="condition.value"
          type="text"
          class="w-full"
        />
      </div>
    </div>

    <UButton
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      :aria-label="$t('filters.removeCondition')"
      @click="emit('remove')"
    />
  </div>
</template>
