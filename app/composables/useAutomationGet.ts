import type { ApiAutomation } from '~/types/automation'
import { normalizeAutomation } from '~/types/automation'

export function useAutomationGet(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `automation-${id}`,
    () => get<ApiAutomation>(`/api/automations/${id}`),
  )

  const automation = computed(() => data.value?.data ? normalizeAutomation(data.value.data) : null)

  return { automation, pending, error, refresh }
}
