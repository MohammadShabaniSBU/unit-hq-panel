<script setup lang="ts">
import type { AutomationEdge, AutomationNode, TargetRecord, TargetRecordMode } from '~/types/automation'
import type { ApiOption } from '~/types/facility'
import type { FilterEntityType } from '~/types/filter'

const props = defineProps<{
  modelValue: TargetRecord
  objectType: string
  nodeKey: string
  nodes: Array<AutomationNode>
  edges: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>
  /** When false, trigger_subject is allowed for any trigger object type (e.g. task/note relatedTo). */
  requireMatchingObjectType?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TargetRecord]
}>()

const requireMatchingObjectType = computed(() => props.requireMatchingObjectType !== false)

const { t } = useI18n()
const { get } = useApi()
const { upstreamIdOptions, triggerObjectType } = useAutomationReachability()

const showAdvanced = ref(props.modelValue.mode === 'expression')

const triggerType = computed(() => triggerObjectType(props.nodes))
const triggerCompatible = computed(() => {
  if (!triggerType.value) {
    return false
  }
  if (!requireMatchingObjectType.value) {
    return true
  }
  return !!props.objectType && triggerType.value === props.objectType
})

const stepOptions = computed(() =>
  upstreamIdOptions(props.nodeKey, props.objectType, props.nodes, props.edges)
)

const modeItems = computed(() => {
  const items: Array<{ label: string, value: TargetRecordMode, disabled?: boolean }> = [
    {
      label: t('automations.config.targetRecord.triggerSubject'),
      value: 'trigger_subject',
      disabled: !triggerCompatible.value
    }
  ]

  if (stepOptions.value.length > 0) {
    items.push({
      label: t('automations.config.targetRecord.stepOutput'),
      value: 'step_output'
    })
  }

  items.push({
    label: t('automations.config.targetRecord.static'),
    value: 'static'
  })

  return items
})

const currentMode = computed<TargetRecordMode>(() => {
  if (props.modelValue.mode === 'expression') {
    return 'expression'
  }
  return props.modelValue.mode
})

const stepSelectItems = computed(() =>
  stepOptions.value.map(opt => ({
    label: opt.label,
    value: `${opt.nodeKey}::${opt.field}`
  }))
)

const selectedStepValue = computed(() => {
  if (props.modelValue.mode !== 'step_output') {
    return undefined
  }
  return `${props.modelValue.nodeKey}::${props.modelValue.field}`
})

const OPTIONS_URL: Partial<Record<FilterEntityType, string>> = {
  contact: '/api/contacts/options',
  deal: '/api/deals/options',
  unit: '/api/units/options'
}

const optionsUrl = computed(() => OPTIONS_URL[props.objectType as FilterEntityType])
const hasSearchableOptions = computed(() => !!optionsUrl.value)

const recordSearch = ref('')
const selectedRecord = ref<ApiOption | null>(null)
const asyncSearchItems = ref<Array<ApiOption>>([])
const asyncSearchPending = ref(false)

watch(
  [recordSearch, optionsUrl],
  async ([query, url]) => {
    if (!url || !query || String(query).length < 1) {
      asyncSearchItems.value = []
      return
    }
    asyncSearchPending.value = true
    try {
      const res = await get<ApiOption[]>(String(url), { search: String(query) })
      asyncSearchItems.value = res.data ?? []
    } catch {
      asyncSearchItems.value = []
    } finally {
      asyncSearchPending.value = false
    }
  }
)

const recordSelectItems = computed(() => {
  const items = asyncSearchItems.value
  if (!selectedRecord.value) {
    return items
  }
  if (items.some(item => item.value === selectedRecord.value!.value)) {
    return items
  }
  return [selectedRecord.value, ...items]
})

watch(
  () => props.modelValue,
  (value) => {
    if (value.mode === 'static' && value.id) {
      selectedRecord.value = {
        value: value.id,
        label: selectedRecord.value?.value === value.id
          ? selectedRecord.value.label
          : `#${value.id}`
      }
    }
    if (value.mode === 'expression') {
      showAdvanced.value = true
    }
  },
  { immediate: true }
)

watch(
  [triggerCompatible, stepOptions],
  () => {
    if (props.modelValue.mode === 'trigger_subject' && !triggerCompatible.value) {
      emit('update:modelValue', { mode: 'expression', template: '' })
      showAdvanced.value = true
      return
    }
    if (props.modelValue.mode === 'step_output' && stepOptions.value.length === 0) {
      emit('update:modelValue', { mode: 'expression', template: '' })
      showAdvanced.value = true
    }
  }
)

function setMode(mode: TargetRecordMode) {
  if (mode === 'trigger_subject') {
    emit('update:modelValue', { mode: 'trigger_subject' })
    return
  }
  if (mode === 'step_output') {
    const first = stepOptions.value[0]
    emit('update:modelValue', {
      mode: 'step_output',
      nodeKey: first?.nodeKey ?? '',
      field: first?.field ?? 'subject_id'
    })
    return
  }
  if (mode === 'static') {
    emit('update:modelValue', {
      mode: 'static',
      objectType: props.objectType,
      id: props.modelValue.mode === 'static' ? props.modelValue.id : 0
    })
    return
  }
  emit('update:modelValue', {
    mode: 'expression',
    template: props.modelValue.mode === 'expression' ? props.modelValue.template : ''
  })
}

function onStepSelect(value: string) {
  const [nodeKey, field] = value.split('::')
  emit('update:modelValue', {
    mode: 'step_output',
    nodeKey: nodeKey ?? '',
    field: field ?? 'subject_id'
  })
}

function onStaticSelect(value: number | undefined) {
  if (value == null) {
    selectedRecord.value = null
    emit('update:modelValue', { mode: 'static', objectType: props.objectType, id: 0 })
    return
  }
  selectedRecord.value = recordSelectItems.value.find(item => item.value === value) ?? {
    value,
    label: String(value)
  }
  emit('update:modelValue', { mode: 'static', objectType: props.objectType, id: Number(value) })
}

function onStaticIdInput(raw: string) {
  const id = Number(raw)
  emit('update:modelValue', {
    mode: 'static',
    objectType: props.objectType,
    id: Number.isFinite(id) ? id : 0
  })
}

function onExpression(template: string) {
  emit('update:modelValue', { mode: 'expression', template })
}

function enableAdvanced() {
  showAdvanced.value = true
  if (props.modelValue.mode !== 'expression') {
    setMode('expression')
  }
}
</script>

<template>
  <div class="space-y-3">
    <UFormField :label="$t('automations.config.targetSource')">
      <USelectMenu
        :model-value="currentMode === 'expression' ? undefined : currentMode"
        :items="modeItems"
        value-key="value"
        :placeholder="$t('automations.config.targetRecord.chooseMode')"
        class="w-full"
        @update:model-value="setMode($event)"
      />
      <p
        v-if="!triggerCompatible"
        class="mt-1 text-xs text-dimmed"
      >
        {{ $t('automations.config.targetRecord.triggerIncompatible') }}
      </p>
    </UFormField>

    <UFormField
      v-if="modelValue.mode === 'step_output'"
      :label="$t('automations.config.targetRecord.previousStep')"
    >
      <USelectMenu
        :model-value="selectedStepValue"
        :items="stepSelectItems"
        value-key="value"
        class="w-full"
        @update:model-value="onStepSelect($event)"
      />
    </UFormField>

    <UFormField
      v-if="modelValue.mode === 'static'"
      :label="$t('automations.config.targetRecord.specificRecord')"
    >
      <USelectMenu
        v-if="hasSearchableOptions"
        v-model:search-term="recordSearch"
        :model-value="modelValue.id || undefined"
        :items="recordSelectItems"
        value-key="value"
        ignore-filter
        :loading="asyncSearchPending"
        :placeholder="$t('automations.config.targetRecord.searchRecord')"
        searchable
        class="w-full"
        @update:model-value="onStaticSelect($event)"
      />
      <UInput
        v-else
        :model-value="modelValue.id ? String(modelValue.id) : ''"
        type="number"
        :placeholder="$t('automations.config.staticIdPlaceholder')"
        class="w-full"
        @update:model-value="onStaticIdInput(String($event))"
      />
    </UFormField>

    <div class="rounded-lg border border-default p-3">
      <button
        type="button"
        class="flex w-full items-center justify-between text-left text-xs font-medium text-dimmed"
        @click="showAdvanced ? (showAdvanced = false) : enableAdvanced()"
      >
        <span>{{ $t('automations.config.targetRecord.advanced') }}</span>
        <UIcon
          :name="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-4"
        />
      </button>

      <div
        v-if="showAdvanced"
        class="mt-2 space-y-2"
      >
        <p class="text-xs text-dimmed">
          {{ $t('automations.config.targetRecord.advancedHint') }}
        </p>
        <UInput
          :model-value="modelValue.mode === 'expression' ? modelValue.template : ''"
          placeholder="{{trigger.contact.id}}"
          class="w-full font-mono"
          @update:model-value="onExpression($event)"
          @focus="setMode('expression')"
        />
      </div>
    </div>
  </div>
</template>
