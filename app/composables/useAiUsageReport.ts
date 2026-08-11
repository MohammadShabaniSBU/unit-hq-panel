import type { AiUsageGroupBy, AiUsageReportMeta, AiUsageReportResponse, AiUsageReportRow } from '~/types/ai'

function defaultFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useAiUsageReport() {
  const { apiFetch } = useApi()

  const from = ref<string>(defaultFrom())
  const to = ref<string>(defaultTo())
  const groupBy = ref<AiUsageGroupBy>('employee')

  const { data, pending, error, refresh } = useAsyncData(
    () => `settings-ai-usage-${from.value}-${to.value}-${groupBy.value}`,
    () => apiFetch<AiUsageReportResponse>('/api/insights/ai-usage', {
      query: {
        from: from.value,
        to: to.value,
        group_by: groupBy.value
      }
    }),
    { watch: [from, to, groupBy] }
  )

  const rows = computed<Array<AiUsageReportRow>>(() => data.value?.data ?? [])
  const meta = computed<AiUsageReportMeta | null>(() => data.value?.meta ?? null)

  return {
    rows,
    meta,
    pending,
    error,
    refresh,
    from,
    to,
    groupBy
  }
}
