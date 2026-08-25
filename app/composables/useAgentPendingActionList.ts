import type { AgentPendingAction } from '~/types/agents'
import type { ApiPaginatedResponse } from '~/types/facility'
import { pendingActionFetchErrors } from '~/composables/useAgentPendingAction'

export function useAgentPendingActionList() {
  const { getPaginated } = useApi()
  const { approve: postApprove, reject: postReject } = useAgentPendingAction()
  const { refresh: refreshBadge } = useAgentPendingBadge()
  const { page, perPage, goToPrevPage, goToNextPage: nextPage, goToPage: setPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'agent-pending-actions',
    () => getPaginated<AgentPendingAction>('/api/agent-pending-actions', {
      status: 'pending',
      page: page.value,
      per_page: perPage.value
    }),
    { watch: [page, perPage] }
  )

  const actions = computed<Array<AgentPendingAction>>(() => data.value?.data ?? [])
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const showingCount = computed(() => actions.value.length)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  function replaceRow(next: AgentPendingAction) {
    if (!data.value) {
      return
    }
    data.value = {
      ...data.value,
      data: data.value.data.map(row => (row.id === next.id ? next : row))
    } as ApiPaginatedResponse<AgentPendingAction>
  }

  function removeRow(id: number) {
    if (!data.value) {
      return
    }
    data.value = {
      ...data.value,
      data: data.value.data.filter(row => row.id !== id),
      meta: {
        ...data.value.meta,
        total: Math.max(0, data.value.meta.total - 1)
      }
    }
  }

  async function approve(id: number): Promise<'ok' | 'failed' | 'expired'> {
    try {
      const next = await postApprove(id)
      replaceRow(next)
      void refreshBadge()
      return 'ok'
    } catch (err: unknown) {
      const parsed = pendingActionFetchErrors(err)
      if (parsed.expiredReason) {
        removeRow(id)
        void refreshBadge()
        return 'expired'
      }
      if (parsed.failureReason) {
        const current = actions.value.find(row => row.id === id)
        if (current) {
          replaceRow({ ...current, failure_reason: parsed.failureReason, status: 'pending' })
        }
        return 'failed'
      }
      throw err
    }
  }

  async function reject(id: number, reason?: string): Promise<void> {
    const next = await postReject(id, reason)
    replaceRow(next)
    void refreshBadge()
  }

  function goToNextPage() {
    nextPage(lastPage.value)
  }

  function goToPage(next: number) {
    setPage(next, lastPage.value)
  }

  return {
    actions,
    pending,
    error,
    refresh,
    page,
    perPage,
    totalCount,
    lastPage,
    showingCount,
    canGoPrev,
    canGoNext,
    goToPrevPage,
    goToNextPage,
    goToPage,
    approve,
    reject
  }
}
