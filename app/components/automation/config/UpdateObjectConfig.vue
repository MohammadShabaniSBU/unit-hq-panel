<script setup lang="ts">
import type {
  UpdateObjectActionConfig,
  FieldUpdate,
  TargetRecord,
  AutomationNode,
  AutomationEdge
} from '~/types/automation'
import type { FilterEntityType } from '~/types/filter'
import { normalizeTargetRecord } from '~/types/automation'

const props = defineProps<{
  config: UpdateObjectActionConfig
  nodeKey: string
  nodes: Array<AutomationNode>
  edges: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>
}>()

const emit = defineEmits<{
  'update:config': [config: UpdateObjectActionConfig]
}>()

const objectTypeOptions: Array<{ label: string, value: FilterEntityType }> = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Unit', value: 'unit' },
  { label: 'Contract', value: 'contract' },
  { label: 'Reservation', value: 'reservation' }
]

const targetRecord = computed<TargetRecord>(() =>
  props.config.targetRecord
  ?? normalizeTargetRecord(props.config as unknown as Record<string, unknown>, props.config.objectType)
)

function update(patch: Partial<UpdateObjectActionConfig>) {
  emit('update:config', {
    ...props.config,
    targetRecord: targetRecord.value,
    ...patch
  })
}

function onObjectTypeChange(objectType: string) {
  let nextTarget = targetRecord.value

  if (nextTarget.mode === 'trigger_subject') {
    const trigger = props.nodes.find(n => n.kind === 'trigger')
    const triggerType = (trigger?.config as { objectType?: string } | undefined)?.objectType
    if (triggerType !== objectType) {
      nextTarget = { mode: 'expression', template: '' }
    }
  } else if (nextTarget.mode === 'static') {
    nextTarget = { mode: 'static', objectType, id: 0 }
  } else if (nextTarget.mode === 'step_output') {
    nextTarget = { mode: 'expression', template: '' }
  }

  emit('update:config', {
    ...props.config,
    objectType,
    targetRecord: nextTarget,
    updates: props.config.updates.map(u => ({
      ...u,
      property: '',
      value: u.value.kind === 'static' ? { kind: 'static' as const, value: '' } : u.value
    }))
  })
}

function onTargetRecordChange(value: TargetRecord) {
  update({ targetRecord: value })
}

function onFieldsChange(fields: Array<FieldUpdate>) {
  update({ updates: fields })
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

    <AutomationConfigTargetRecordPicker
      :model-value="targetRecord"
      :object-type="config.objectType"
      :node-key="nodeKey"
      :nodes="nodes"
      :edges="edges"
      @update:model-value="onTargetRecordChange"
    />

    <AutomationConfigFieldUpdatesEditor
      :model-value="config.updates"
      :object-type="config.objectType"
      @update:model-value="onFieldsChange"
    />
  </div>
</template>
