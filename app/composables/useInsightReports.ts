import type { InsightReport, InsightReportWritePayload } from '~/types/insights'

export interface InsightSaveError {
  message: string
  errors: Record<string, Array<string>>
  validationDetail: InsightReport['validation_detail']
  validationStatus: InsightReport['validation_status'] | null
}

function parseSaveError(err: unknown, fallback: string): InsightSaveError {
  const fetchError = err as {
    data?: {
      message?: string
      errors?: Record<string, unknown>
    }
  }
  const errors = fetchError.data?.errors ?? {}
  const normalizedErrors: Record<string, Array<string>> = {}

  for (const [key, value] of Object.entries(errors)) {
    if (key === 'validation_detail' || key === 'validation_status') {
      continue
    }
    if (Array.isArray(value)) {
      normalizedErrors[key] = value.map(String)
    } else if (typeof value === 'string') {
      normalizedErrors[key] = [value]
    }
  }

  const firstFieldError = Object.values(normalizedErrors)[0]?.[0]

  const detailRaw = errors.validation_detail
  let validationDetail: InsightReport['validation_detail'] = null

  if (detailRaw && typeof detailRaw === 'object' && !Array.isArray(detailRaw)) {
    validationDetail = detailRaw as InsightReport['validation_detail']
  } else if (typeof detailRaw === 'string') {
    try {
      validationDetail = JSON.parse(detailRaw) as InsightReport['validation_detail']
    } catch {
      validationDetail = { message: detailRaw }
    }
  } else if (Array.isArray(detailRaw) && typeof detailRaw[0] === 'string') {
    try {
      validationDetail = JSON.parse(detailRaw[0]) as InsightReport['validation_detail']
    } catch {
      validationDetail = { message: detailRaw[0] }
    }
  }

  const statusRaw = errors.validation_status
  const validationStatus = (
    typeof statusRaw === 'string'
      ? statusRaw
      : Array.isArray(statusRaw)
        ? statusRaw[0]
        : null
  ) as InsightReport['validation_status'] | null

  const messageFromDetail = validationDetail?.message
    ?? validationDetail?.mismatches?.[0]?.instruction

  return {
    message: (typeof messageFromDetail === 'string' ? messageFromDetail : null)
      ?? firstFieldError
      ?? fetchError.data?.message
      ?? fallback,
    errors: normalizedErrors,
    validationDetail,
    validationStatus
  }
}

export function useInsightReports() {
  const { get, post, patch } = useApi()
  const { t } = useI18n()
  const insightRegistry = useInsightRegistryStore()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)
  const lastSaveError = ref<InsightSaveError | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-insight-reports',
    () => get<Array<InsightReport>>('/api/settings/insight-reports', { status: 'active' })
  )

  const reports = computed(() => data.value?.data ?? [])

  async function refreshNavFeed() {
    if (insightRegistry.loaded) {
      await insightRegistry.refresh()
    }
  }

  async function create(payload: InsightReportWritePayload): Promise<InsightReport | null> {
    submitting.value = true
    actionError.value = null
    lastSaveError.value = null
    try {
      const res = await post<InsightReport>('/api/settings/insight-reports', {
        ...payload
      })
      await refresh()
      await refreshNavFeed()
      return res.data
    } catch (err: unknown) {
      const parsed = parseSaveError(err, t('settings.insights.reports.saveError'))
      lastSaveError.value = parsed
      actionError.value = parsed.message
      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(
    id: number,
    payload: InsightReportWritePayload
  ): Promise<InsightReport | null> {
    submitting.value = true
    actionError.value = null
    lastSaveError.value = null
    try {
      const res = await patch<InsightReport>(`/api/settings/insight-reports/${id}`, {
        ...payload
      })
      await refresh()
      await refreshNavFeed()
      return res.data
    } catch (err: unknown) {
      const parsed = parseSaveError(err, t('settings.insights.reports.saveError'))
      lastSaveError.value = parsed
      actionError.value = parsed.message
      return null
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: number): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post(`/api/settings/insight-reports/${id}/archive`, {})
      await refresh()
      await refreshNavFeed()
      return true
    } catch (err: unknown) {
      const parsed = parseSaveError(err, t('settings.insights.reports.archiveError'))
      actionError.value = parsed.message
      return false
    } finally {
      submitting.value = false
    }
  }

  async function reorder(ids: Array<number>): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post('/api/settings/insight-reports/reorder', { ids })
      await refresh()
      await refreshNavFeed()
      return true
    } catch (err: unknown) {
      const parsed = parseSaveError(err, t('settings.insights.reports.reorderError'))
      actionError.value = parsed.message
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    reports,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    lastSaveError,
    create,
    update,
    archive,
    reorder
  }
}
