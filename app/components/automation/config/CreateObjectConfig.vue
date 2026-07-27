<script setup lang="ts">
import type {
  AutomationEdge,
  AutomationNode,
  CreateObjectActionConfig,
  FieldUpdate,
  TargetRecord
} from '~/types/automation'
import { CREATE_OBJECT_FIELD_CATALOG } from '~/types/automation'
import { useAutomationReachability } from '~/composables/useAutomationReachability'

const props = defineProps<{
  config: CreateObjectActionConfig
  nodeKey: string
  nodes: Array<AutomationNode>
  edges: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>
}>()

const emit = defineEmits<{
  'update:config': [config: CreateObjectActionConfig]
}>()

const { triggerObjectType } = useAutomationReachability()

const objectTypeOptions = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Task', value: 'task' },
  { label: 'Note', value: 'note' }
]

const relatedParentTypeOptions = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Unit', value: 'unit' },
  { label: 'Contract', value: 'contract' },
  { label: 'Reservation', value: 'reservation' }
]

const needsRelatedTo = computed(() =>
  props.config.objectType === 'task' || props.config.objectType === 'note'
)

const catalogItems = computed(() => {
  if (props.config.objectType === 'task' || props.config.objectType === 'note') {
    return CREATE_OBJECT_FIELD_CATALOG[props.config.objectType]
  }
  return undefined
})

const relatedTo = computed<TargetRecord>(() => props.config.relatedTo ?? { mode: 'trigger_subject' })

const relatedParentType = ref(triggerObjectType(props.nodes) || 'contact')

watch(
  () => triggerObjectType(props.nodes),
  (type) => {
    if (type) {
      relatedParentType.value = type
    }
  }
)

function update(patch: Partial<CreateObjectActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...patch
  })
}

function onObjectTypeChange(objectType: string) {
  const nextType = objectType as CreateObjectActionConfig['objectType']
  const patch: Partial<CreateObjectActionConfig> = {
    objectType: nextType,
    fields: props.config.fields.map(u => ({
      ...u,
      property: '',
      value: u.value.kind === 'static' ? { kind: 'static' as const, value: '' } : u.value
    }))
  }

  if (nextType === 'task' || nextType === 'note') {
    patch.relatedTo = props.config.relatedTo ?? { mode: 'trigger_subject' }
  } else {
    patch.relatedTo = undefined
  }

  update(patch)
}

function onRelatedToChange(value: TargetRecord) {
  if (value.mode === 'static') {
    update({
      relatedTo: {
        mode: 'static',
        objectType: relatedParentType.value,
        id: value.id
      }
    })
    return
  }
  update({ relatedTo: value })
}

function onRelatedParentTypeChange(objectType: string) {
  relatedParentType.value = objectType
  if (relatedTo.value.mode === 'static') {
    update({
      relatedTo: {
        mode: 'static',
        objectType,
        id: relatedTo.value.id
      }
    })
  }
}

function onFieldsChange(fields: Array<FieldUpdate>) {
  update({ fields })
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

    <template v-if="needsRelatedTo">
      <div class="space-y-2">
        <span class="text-sm font-medium text-highlighted">{{ $t('automations.config.relatedTo') }}</span>
        <p class="text-xs text-dimmed">
          {{ $t('automations.config.relatedToHint') }}
        </p>
        <UFormField
          v-if="relatedTo.mode === 'static' || relatedTo.mode === 'step_output'"
          :label="$t('automations.config.relatedParentType')"
        >
          <USelectMenu
            :model-value="relatedParentType"
            :items="relatedParentTypeOptions"
            value-key="value"
            class="w-full"
            @update:model-value="onRelatedParentTypeChange($event)"
          />
        </UFormField>
        <AutomationConfigTargetRecordPicker
          :model-value="relatedTo"
          :object-type="relatedParentType"
          :node-key="nodeKey"
          :nodes="nodes"
          :edges="edges"
          :require-matching-object-type="false"
          @update:model-value="onRelatedToChange"
        />
      </div>
    </template>

    <AutomationConfigFieldUpdatesEditor
      :model-value="config.fields"
      :object-type="config.objectType"
      :catalog-items="catalogItems"
      title-key="automations.config.fieldValues"
      add-label-key="automations.config.addField"
      empty-key="automations.config.noFields"
      @update:model-value="onFieldsChange"
    />
  </div>
</template>
