import type { AiAgent, AiAgentsListResponse } from '~/types/agents'

export function useAgentList() {
  const { apiFetch } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'ai-agents',
    () => apiFetch<AiAgentsListResponse>('/api/ai/agents')
  )

  const agents = computed<Array<AiAgent>>(() => data.value?.data ?? [])

  return { agents, pending, error, refresh }
}
