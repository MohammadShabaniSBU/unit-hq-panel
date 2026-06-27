import type { ApiAutomation, AutomationNode, AutomationEdge } from '~/types/automation'
import { normalizeAutomation } from '~/types/automation'

export interface AutomationSavePayload {
  name?: string
  description?: string
  enabled?: boolean
  nodes?: Array<AutomationNode>
  edges?: Array<AutomationEdge>
}

export function useAutomationCreate() {
  const { post } = useApi()
  const { t } = useI18n()
  const submitting = ref(false)
  const name = ref('')
  const description = ref('')
  const fieldErrors = ref<Record<string, Array<string>>>({})
  const error = ref<string | null>(null)

  function reset() {
    name.value = ''
    description.value = ''
    fieldErrors.value = {}
    error.value = null
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiAutomation>('/api/automations', {
        name: name.value.trim(),
        description: description.value.trim() || null,
        nodes: [],
        edges: [],
      })
      reset()
      return normalizeAutomation(response.data)
    }
    catch (err: unknown) {
      const fetchError = err as { data?: { message?: string; errors?: Record<string, Array<string>> } }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.automation.createErrorMessage')
      return null
    }
    finally {
      submitting.value = false
    }
  }

  return { name, description, submitting, error, fieldErrors, reset, submit }
}

export function useAutomationSave() {
  const { patch } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const saving = ref(false)

  async function save(id: string | number, payload: AutomationSavePayload) {
    saving.value = true
    try {
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.description !== undefined) body.description = payload.description
      if (payload.enabled !== undefined) body.enabled = payload.enabled
      if (payload.nodes !== undefined) {
        body.nodes = payload.nodes.map(n => ({
          id: n.id,
          node_key: n.nodeKey,
          kind: n.kind,
          type: n.type,
          label: n.label,
          description: n.description,
          position_x: n.position.x,
          position_y: n.position.y,
          config: n.config,
          metadata: n.metadata,
        }))
      }
      if (payload.edges !== undefined) {
        body.edges = payload.edges.map(e => ({
          id: e.id,
          source_node_id: e.sourceNodeId,
          target_node_id: e.targetNodeId,
          source_handle: e.sourceHandle,
          target_handle: e.targetHandle,
          label: e.label,
          condition: e.condition,
        }))
      }

      const response = await patch<ApiAutomation>(`/api/automations/${id}`, body)
      toast.add({ title: t('forms.automation.saveSuccessMessage'), color: 'success' })
      return normalizeAutomation(response.data)
    }
    catch {
      toast.add({ title: t('forms.automation.saveErrorMessage'), color: 'error' })
      return null
    }
    finally {
      saving.value = false
    }
  }

  async function toggleEnabled(id: string | number, enabled: boolean) {
    saving.value = true
    try {
      const response = await patch<ApiAutomation>(`/api/automations/${id}`, { enabled })
      return normalizeAutomation(response.data)
    }
    catch {
      toast.add({ title: t('forms.automation.saveErrorMessage'), color: 'error' })
      return null
    }
    finally {
      saving.value = false
    }
  }

  return { saving, save, toggleEnabled }
}
