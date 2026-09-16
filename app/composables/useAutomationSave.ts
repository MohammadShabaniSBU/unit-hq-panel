import { nanoid } from 'nanoid'
import type { ApiAutomation, AutomationNode, AutomationEdge, AutomationStatus, TriggerNodeType } from '~/types/automation'
import { NODE_TYPE_DEFINITIONS, normalizeAutomation } from '~/types/automation'

export interface AutomationSavePayload {
  name?: string
  description?: string
  status?: AutomationStatus
  nodes?: Array<AutomationNode>
  edges?: Array<AutomationEdge>
}

export function useAutomationCreate() {
  const { post } = useApi()
  const { t } = useI18n()
  const submitting = ref(false)
  const name = ref('')
  const description = ref('')
  const triggerType = ref<TriggerNodeType | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})
  const error = ref<string | null>(null)

  function reset() {
    name.value = ''
    description.value = ''
    triggerType.value = null
    fieldErrors.value = {}
    error.value = null
  }

  function buildInitialTriggerNode(type: TriggerNodeType) {
    const def = NODE_TYPE_DEFINITIONS[type]
    const nodeKey = `${type.replace(/\./g, '_')}_${nanoid(8)}`

    return {
      node_key: nodeKey,
      kind: def.kind,
      type,
      label: def.label,
      position_x: 0,
      position_y: 0,
      config: def.createDefaultConfig()
    }
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    if (!triggerType.value) {
      fieldErrors.value = { triggerType: [t('automations.create.triggerRequired')] }
      submitting.value = false
      return null
    }

    try {
      const response = await post<ApiAutomation>('/api/automations', {
        name: name.value.trim(),
        description: description.value.trim() || null,
        nodes: [buildInitialTriggerNode(triggerType.value)],
        edges: []
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

  return { name, description, triggerType, submitting, error, fieldErrors, reset, submit }
}

export function useAutomationSave() {
  const { patch, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const saving = ref(false)

  async function save(id: string | number, payload: AutomationSavePayload) {
    saving.value = true
    try {
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.description !== undefined) body.description = payload.description
      if (payload.status !== undefined) body.status = payload.status
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

  async function activate(id: string | number) {
    saving.value = true
    try {
      const response = await post<ApiAutomation>(`/api/automations/${id}/activate`, {})
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

  async function deactivate(id: string | number) {
    saving.value = true
    try {
      const response = await post<ApiAutomation>(`/api/automations/${id}/deactivate`, {})
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

  return { saving, save, activate, deactivate }
}
