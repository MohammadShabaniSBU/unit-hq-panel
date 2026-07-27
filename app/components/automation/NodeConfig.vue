<script setup lang="ts">
import type {
  AutomationNode,
  AutomationNodeConfig,
  AutomationNodeType,
  AutomationEdge,
  PropertyUpdateTriggerConfig,
  ObjectCreationTriggerConfig,
  ScheduleTriggerConfig,
  UpdateObjectActionConfig,
  CreateObjectActionConfig,
  SendEmailActionConfig

} from '~/types/automation'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

const props = defineProps<{
  node: AutomationNode | null
  nodes?: Array<AutomationNode>
  edges?: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>
}>()

const emit = defineEmits<{
  'update:config': [nodeId: string, config: AutomationNodeConfig]
  'update:label': [nodeId: string, label: string]
  'remove-node': [nodeId: string]
}>()

const def = computed(() => props.node ? NODE_TYPE_DEFINITIONS[props.node.type] : null)

const graphNodes = computed(() => props.nodes ?? [])
const graphEdges = computed(() => props.edges ?? [])

function handleConfigUpdate(config: AutomationNodeConfig) {
  if (props.node) {
    emit('update:config', props.node.id, config)
  }
}

function handleLabelUpdate(label: string) {
  if (props.node) {
    emit('update:label', props.node.id, label)
  }
}

const isType = (type: AutomationNodeType) => props.node?.type === type
</script>

<template>
  <div class="flex flex-col">
    <!-- Empty state -->
    <div
      v-if="!node"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <UIcon
        name="i-lucide-mouse-pointer-click"
        class="size-8 text-dimmed"
      />
      <div>
        <p class="text-sm font-medium text-highlighted">
          {{ $t('automations.config.noNodeSelected') }}
        </p>
        <p class="mt-0.5 text-xs text-dimmed">
          {{ $t('automations.config.clickNodeToConfig') }}
        </p>
      </div>
    </div>

    <!-- Node config panel -->
    <template v-else>
      <!-- Node header -->
      <div class="border-b border-default px-4 py-3">
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div
              class="flex size-7 items-center justify-center rounded-lg"
              :class="def?.kind === 'trigger' ? 'bg-violet-500/10 text-violet-600' : 'bg-emerald-500/10 text-emerald-600'"
            >
              <UIcon
                :name="def?.icon ?? 'i-lucide-circle'"
                class="size-4"
              />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                {{ def?.kind }}
              </p>
            </div>
          </div>
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            size="xs"
            @click="emit('remove-node', node.id)"
          />
        </div>

        <!-- Editable label -->
        <UInput
          :model-value="node.label"
          class="w-full"
          size="sm"
          @update:model-value="handleLabelUpdate"
        />
      </div>

      <!-- Scrollable config area -->
      <div class="flex-1 overflow-y-auto p-4">
        <AutomationConfigPropertyUpdateConfig
          v-if="isType('trigger.object_updated')"
          :config="node.config as PropertyUpdateTriggerConfig"
          @update:config="handleConfigUpdate"
        />
        <AutomationConfigObjectCreationConfig
          v-else-if="isType('trigger.object_created')"
          :config="node.config as ObjectCreationTriggerConfig"
          @update:config="handleConfigUpdate"
        />
        <AutomationConfigScheduleConfig
          v-else-if="isType('trigger.schedule')"
          :config="node.config as ScheduleTriggerConfig"
          @update:config="handleConfigUpdate"
        />
        <AutomationConfigUpdateObjectConfig
          v-else-if="isType('action.update_object')"
          :config="node.config as UpdateObjectActionConfig"
          :node-key="node.nodeKey"
          :nodes="graphNodes"
          :edges="graphEdges"
          @update:config="handleConfigUpdate"
        />
        <AutomationConfigCreateObjectConfig
          v-else-if="isType('action.create_object')"
          :config="node.config as CreateObjectActionConfig"
          :node-key="node.nodeKey"
          :nodes="graphNodes"
          :edges="graphEdges"
          @update:config="handleConfigUpdate"
        />
        <AutomationConfigSendEmailConfig
          v-else-if="isType('action.send_email')"
          :config="node.config as SendEmailActionConfig"
          @update:config="handleConfigUpdate"
        />
      </div>
    </template>
  </div>
</template>
