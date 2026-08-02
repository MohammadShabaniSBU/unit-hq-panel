import type {
  ApiAccessPoint,
  ApiAccessPointMappingRow,
  ApiAccessPointSuggestion
} from '~/types/access'

export function useAccessPoints() {
  const { get, post, patch } = useApi()
  const { t } = useI18n()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-access-points',
    () => get<{ rows: Array<ApiAccessPointMappingRow> }>('/api/settings/access/points')
  )

  const rows = computed(() => data.value?.data?.rows ?? [])

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function assign(payload: {
    provider_point_id: string
    site_id: number
    unit_id?: number | null
    point_type: string
    label?: string
  }) {
    submitting.value = true
    actionError.value = null
    try {
      await post<ApiAccessPoint>('/api/settings/access/points', payload)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.points.assignError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function updatePoint(id: number, payload: {
    site_id?: number
    unit_id?: number | null
    point_type?: string
    label?: string
  }) {
    submitting.value = true
    actionError.value = null
    try {
      await patch<ApiAccessPoint>(`/api/settings/access/points/${id}`, payload)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.points.updateError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: number) {
    submitting.value = true
    actionError.value = null
    try {
      await post<ApiAccessPoint>(`/api/settings/access/points/${id}/archive`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.points.archiveError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function suggest(): Promise<Array<ApiAccessPointSuggestion>> {
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<{ suggestions: Array<ApiAccessPointSuggestion> }>(
        '/api/settings/access/points/suggest',
        {}
      )
      return response.data?.suggestions ?? []
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.points.suggestError'))
      return []
    } finally {
      submitting.value = false
    }
  }

  async function bulkAssign(assignments: Array<{
    provider_point_id: string
    site_id: number
    unit_id: number | null
    point_type: string
  }>): Promise<number | null> {
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<{ confirmed_count: number }>(
        '/api/settings/access/points/bulk-assign',
        { assignments }
      )
      await refresh()
      return response.data?.confirmed_count ?? 0
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.points.bulkError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    rows,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    assign,
    updatePoint,
    archive,
    suggest,
    bulkAssign
  }
}
