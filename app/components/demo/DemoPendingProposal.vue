<script setup lang="ts">
import type { AgentPendingAction } from '~/types/agents'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  pendingActionId: number
  toolKey: string
  result?: unknown
}>()

const { can } = usePermissions()
const { show } = useAgentPendingAction()
const canApprove = computed(() => can(Permission.AgentActionApprove))
const action = ref<AgentPendingAction | null>(null)
const loadError = ref(false)

function previewFromResult(result: unknown): Record<string, unknown> | null {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    return null
  }
  const preview = (result as { preview?: unknown }).preview
  if (preview === null || typeof preview !== 'object' || Array.isArray(preview)) {
    return null
  }
  return preview as Record<string, unknown>
}

function stubAction(): AgentPendingAction {
  return {
    id: props.pendingActionId,
    agent_conversation_id: 0,
    agent_tool_invocation_id: 0,
    ai_agent_id: 0,
    site_id: 0,
    tool_key: props.toolKey,
    payload: {},
    preview: previewFromResult(props.result),
    status: 'pending',
    resolved_by_employee_id: null,
    resolved_at: null,
    rejection_reason: null,
    result_type: null,
    result_id: null,
    failure_reason: null,
    expires_at: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    created_at: null
  }
}

async function load() {
  loadError.value = false
  if (!canApprove.value) {
    action.value = stubAction()
    return
  }

  try {
    action.value = await show(props.pendingActionId)
  } catch {
    loadError.value = true
  }
}

watch(
  () => [props.pendingActionId, props.toolKey, props.result, canApprove.value] as const,
  () => {
    void load()
  },
  { immediate: true }
)
</script>

<template>
  <div class="mt-2">
    <p
      v-if="loadError"
      class="text-xs text-dimmed"
    >
      {{ $t('demo.chat.pendingLoadError') }}
    </p>
    <LeasingAgentPendingActionCard
      v-else-if="action"
      :action="action"
      compact
      :can-act="canApprove"
    />
  </div>
</template>
