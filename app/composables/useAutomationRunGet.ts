import type { ApiAutomationRun } from '~/types/automation'
import { normalizeRun } from '~/types/automation'

export function useAutomationRunGet(
  automationId: MaybeRefOrGetter<string | number>,
  runId: MaybeRefOrGetter<string | number>
) {
  const { get } = useApi()
  const autoId = computed(() => String(toValue(automationId)))
  const id = computed(() => String(toValue(runId)))

  const { data, pending, error, refresh } = useAsyncData(
    () => `automation-run-${autoId.value}-${id.value}`,
    () => get<ApiAutomationRun>(`/api/automations/${autoId.value}/runs/${id.value}`),
    { watch: [autoId, id] }
  )

  const run = computed(() => (data.value?.data ? normalizeRun(data.value.data) : null))

  return { run, pending, error, refresh }
}
