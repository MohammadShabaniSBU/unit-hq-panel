<script setup lang="ts">
import '@vue-flow/core/dist/style.css'
import type { AutomationNodeType, AutomationNodeConfig } from '~/types/automation'

const route = useRoute()
const id = route.params.id as string

const { automation, pending, error } = useAutomationGet(id)
const { saving, save } = useAutomationSave()

const editor = useAutomationEditor()
const automationName = ref('')
const enabled = ref(false)

watch(automation, (a) => {
  if (!a) return
  automationName.value = a.name
  enabled.value = a.enabled
  editor.load(a)
}, { immediate: true })

async function handleSave() {
  if (!automation.value) return
  const { nodes, edges } = editor.extract()
  const result = await save(automation.value.id, {
    name: automationName.value,
    enabled: enabled.value,
    nodes,
    edges,
  })
  if (result) {
    editor.markClean()
  }
}

function handleAddNode(type: AutomationNodeType, position: { x: number; y: number }) {
  editor.addNode(type, position)
}

function handleNodeClick(id: string) {
  editor.selectNode(id)
}

function handleCanvasClick() {
  editor.selectNode(null)
}

function handleRemoveNode(id: string) {
  editor.removeNode(id)
}

function handleConfigUpdate(nodeId: string, config: AutomationNodeConfig) {
  editor.updateNodeConfig(nodeId, config)
}

function handleLabelUpdate(nodeId: string, label: string) {
  editor.updateNodeLabel(nodeId, label)
}

function goBack() {
  navigateTo('/marketing/automations')
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
        v-model:enabled="enabled"
        :saving="saving"
        :is-dirty="editor.isDirty.value"
        @save="handleSave"
        @back="goBack"
      />

      <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr_320px] overflow-hidden">
        <!-- Left: Node palette -->
        <div class="overflow-y-auto border-r border-default">
          <AutomationNodePalette />
        </div>

        <!-- Center: Flow canvas -->
        <div class="relative overflow-hidden">
          <AutomationFlowCanvas
            :nodes="editor.vfNodes.value"
            :edges="editor.vfEdges.value"
            :selected-node-id="editor.selectedNodeId.value"
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
            @update:config="handleConfigUpdate"
            @update:label="handleLabelUpdate"
            @remove-node="handleRemoveNode"
          />
        </div>
      </div>
    </template>
  </div>
</template>
