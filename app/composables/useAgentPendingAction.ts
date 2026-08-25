import type { AgentPendingAction } from '~/types/agents'

export function useAgentPendingAction() {
  const { get, post } = useApi()

  async function show(id: number): Promise<AgentPendingAction> {
    const response = await get<AgentPendingAction>(`/api/agent-pending-actions/${id}`)
    return response.data
  }

  async function approve(id: number): Promise<AgentPendingAction> {
    const response = await post<AgentPendingAction>(`/api/agent-pending-actions/${id}/approve`, {})
    return response.data
  }

  async function reject(id: number, reason?: string): Promise<AgentPendingAction> {
    const body: Record<string, unknown> = {}
    if (reason !== undefined && reason !== '') {
      body.reason = reason
    }
    const response = await post<AgentPendingAction>(`/api/agent-pending-actions/${id}/reject`, body)
    return response.data
  }

  return { show, approve, reject }
}

export function pendingActionFetchErrors(err: unknown): {
  status: number | null
  failureReason: string | null
  expiredReason: string | null
} {
  const fetchError = err as {
    status?: number
    statusCode?: number
    data?: {
      errors?: Record<string, Array<string>>
    }
  }

  return {
    status: fetchError.statusCode ?? fetchError.status ?? null,
    failureReason: fetchError.data?.errors?.failure_reason?.[0] ?? null,
    expiredReason: fetchError.data?.errors?.pending_action?.[0] ?? null
  }
}
