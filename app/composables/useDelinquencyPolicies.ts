import type {
  ApiDelinquencyFiscalFlags,
  ApiDelinquencyPolicy,
  ApiDelinquencyPoliciesPayload,
  DelinquencyPolicyListStatus
} from '~/types/delinquency'

export function useDelinquencyPolicies() {
  const { get, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()

  const statusFilter = ref<DelinquencyPolicyListStatus>('active')
  const policies = ref<Array<ApiDelinquencyPolicy>>([])
  const fiscal = ref<ApiDelinquencyFiscalFlags | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    pending.value = true
    error.value = null

    try {
      const response = await get<ApiDelinquencyPoliciesPayload>('/api/delinquency-policies', {
        status: statusFilter.value
      })
      policies.value = response.data.policies
      fiscal.value = response.data.fiscal
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? t('pages.settings.delinquency.loadError')
    } finally {
      pending.value = false
    }
  }

  async function archivePolicy(policy: ApiDelinquencyPolicy) {
    try {
      await post<ApiDelinquencyPolicy>(`/api/delinquency-policies/${policy.id}/archive`, {})
      toast.add({
        title: t('pages.settings.delinquency.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      const fieldMessage = fetchError.data?.errors?.delinquency_policy?.[0]
      toast.add({
        title: fieldMessage ?? fetchError.data?.message ?? t('pages.settings.delinquency.archiveError'),
        color: 'error'
      })
      return false
    }
  }

  async function unarchivePolicy(policy: ApiDelinquencyPolicy) {
    try {
      await post<ApiDelinquencyPolicy>(`/api/delinquency-policies/${policy.id}/unarchive`, {})
      toast.add({
        title: t('pages.settings.delinquency.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('pages.settings.delinquency.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  watch(statusFilter, () => {
    refresh()
  })

  return {
    statusFilter,
    policies,
    fiscal,
    pending,
    error,
    refresh,
    archivePolicy,
    unarchivePolicy
  }
}
