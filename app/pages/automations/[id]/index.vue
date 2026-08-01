<script setup lang="ts">
import '@vue-flow/core/dist/style.css'
import type { AutomationNodeType, AutomationNodeConfig, AutomationStatus } from '~/types/automation'

const route = useRoute()
const id = route.params.id as string

const { automation, pending, error } = useAutomationGet(id)
const { saving, save } = useAutomationSave()

const editor = useAutomationEditor()
const automationName = ref('')
const status = ref<AutomationStatus>('draft')

const active = computed({
  get: () => status.value === 'active',
  set: (val: boolean) => {
    status.value = val ? 'active' : 'inactive'
  }
})

watch(automation, (a) => {
  if (!a) return
  automationName.value = a.name
  status.value = a.status
  editor.load(a)
}, { immediate: true })

watch([automationName, status], ([name, nextStatus]) => {
  editor.setMeta(name, nextStatus)
})

const isCompiledPlaybook = computed(() => automation.value?.playbookId != null)

const playbookHref = computed(() => {
  const playbookId = automation.value?.playbookId
  if (playbookId == null) return null
  return `/playbooks/${playbookId}`
})

async function handleSave() {
  if (!automation.value || isCompiledPlaybook.value) return
  const { nodes, edges } = editor.extract()
  const result = await save(automation.value.id, {
    name: automationName.value,
    status: status.value,
    nodes,
    edges
  })
  if (result) {
    automationName.value = result.name
    status.value = result.status
    editor.setMeta(result.name, result.status)
    editor.markClean()
  }
}

function handleAddNode(type: AutomationNodeType, position: { x: number, y: number }) {
  if (isCompiledPlaybook.value) return
  editor.addNode(type, position)
}

function handleNodeClick(id: string) {
  editor.selectNode(id)
}

function handleCanvasClick() {
  editor.selectNode(null)
}

function handleRemoveNode(id: string) {
  if (isCompiledPlaybook.value) return
  editor.removeNode(id)
}

function handleConfigUpdate(nodeId: string, config: AutomationNodeConfig) {
  if (isCompiledPlaybook.value) return
  editor.updateNodeConfig(nodeId, config)
}

function handleLabelUpdate(nodeId: string, label: string) {
  if (isCompiledPlaybook.value) return
  editor.updateNodeLabel(nodeId, label)
}

const graphNodes = computed(() =>
  editor.vfNodes.value
    .map(n => n.data?.automationNode)
    .filter((n): n is NonNullable<typeof n> => !!n)
)

const graphEdges = computed(() =>
  editor.vfEdges.value.map(e => ({
    sourceNodeId: e.source,
    targetNodeId: e.target
  }))
)

function goBack() {
  navigateTo('/automations')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Loading -->
    <div
      v-if="pending"
      class="flex flex-1 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error || !automation"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-10 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('automations.editor.loadError') }}
      </p>
      <UButton
        :label="$t('automations.editor.back')"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        @click="goBack"
      />
    </div>

    <!-- Editor -->
    <template v-else>
      <AutomationEditorToolbar
        v-model:automation-name="automationName"
        v-model:enabled="active"
        :automation-id="id"
        :status="status"
        :saving="saving"
        :is-dirty="editor.isDirty.value"
        :readonly="isCompiledPlaybook"
        @save="handleSave"
        @back="goBack"
      />

      <div
        v-if="isCompiledPlaybook"
        class="flex items-center gap-3 border-b border-default bg-elevated/50 px-4 py-3 text-sm"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-4 shrink-0 text-dimmed"
        />
        <p class="text-muted">
          {{ $t('automations.editor.compiledPlaybookBanner') }}
        </p>
        <UButton
          v-if="playbookHref"
          :to="playbookHref"
          :label="$t('automations.editor.openPlaybook')"
          color="primary"
          variant="link"
          size="sm"
          class="ml-auto"
        />
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr_320px] overflow-hidden">
        <!-- Left: Node palette -->
        <div
          v-if="!isCompiledPlaybook"
          class="overflow-y-auto border-r border-default"
        >
          <AutomationNodePalette />
        </div>

        <!-- Center: Flow canvas -->
        <div class="relative overflow-hidden">
          <AutomationFlowCanvas
            :nodes="editor.vfNodes.value"
            :edges="editor.vfEdges.value"
            :selected-node-id="editor.selectedNodeId.value"
            :readonly="isCompiledPlaybook"
            @update:nodes="editor.syncVfNodes"
            @update:edges="editor.syncVfEdges"
            @node-click="handleNodeClick"
            @canvas-click="handleCanvasClick"
            @add-node="handleAddNode"
            @remove-node="handleRemoveNode"
          />
        </div>

        <!-- Right: Node config -->
        <div class="overflow-hidden border-l border-default">
          <AutomationNodeConfig
            :node="editor.selectedNode.value"
            :nodes="graphNodes"
            :edges="graphEdges"
            :readonly="isCompiledPlaybook"
            @update:config="handleConfigUpdate"
            @update:label="handleLabelUpdate"
            @remove-node="handleRemoveNode"
          />
        </div>
      </div>
    </template>
  </div>
</template>
