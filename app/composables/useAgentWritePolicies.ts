import type { AgentWritePolicyPayload, AgentWriteTool, AiAgent, AiAgentsListResponse } from '~/types/agents'

export function useAgentWritePolicies() {
  const { apiFetch, put } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    'ai-agents-write-policies',
    () => apiFetch<AiAgentsListResponse>('/api/ai/agents')
  )

  const agents = computed<Array<AiAgent>>(() => data.value?.data ?? [])
  const savingKeys = ref<Array<string>>([])
  const fieldErrors = ref<Record<string, Array<string>>>({})
  const saveError = ref<string | null>(null)

  function rowKey(agentId: number, toolKey: string): string {
    return `${agentId}:${toolKey}`
  }

  function isSaving(agentId: number, toolKey: string): boolean {
    return savingKeys.value.includes(rowKey(agentId, toolKey))
  }

  async function saveTool(agent: AiAgent, tool: AgentWriteTool): Promise<boolean> {
    const key = rowKey(agent.id, tool.key)
    savingKeys.value = [...savingKeys.value, key]
    saveError.value = null
    fieldErrors.value = {}

    const payload: AgentWritePolicyPayload = {
      tool_key: tool.key,
      mode: tool.mode,
      max_per_conversation: tool.max_per_conversation,
      max_per_day: tool.max_per_day,
      min_verification: tool.min_verification
    }

    try {
      const response = await put<AiAgent>(`/api/ai/agents/${agent.id}/write-policies`, { ...payload })
      const next = response.data
      if (data.value) {
        data.value = {
          ...data.value,
          data: data.value.data.map((row) => {
            return row.id === next.id ? next : row
          })
        }
      }
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }
      fieldErrors.value = fetchError.data?.errors ?? {}
      saveError.value = fetchError.data?.message ?? t('settings.agentWritePolicy.saveError')
      return false
    } finally {
      savingKeys.value = savingKeys.value.filter(item => item !== key)
    }
  }

  return {
    agents,
    pending,
    error,
    refresh,
    saveTool,
    isSaving,
    fieldErrors,
    saveError
  }
}
