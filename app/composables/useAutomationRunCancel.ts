import type { ApiAutomationRun, AutomationRun } from '~/types/automation'
import { normalizeRun } from '~/types/automation'

export function useAutomationRunCancel() {
  const { post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const cancelling = ref(false)

  async function cancelRun(runId: string | number): Promise<AutomationRun | null> {
    cancelling.value = true
    try {
      const response = await post<ApiAutomationRun>(`/api/automation-runs/${runId}/cancel`, {})
      toast.add({
        title: t('automations.runs.lifecycle.cancelSuccess'),
        color: 'success'
      })
      return normalizeRun(response.data)
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('automations.runs.lifecycle.cancelError'),
        color: 'error'
      })
      return null
    } finally {
      cancelling.value = false
    }
  }

  return { cancelRun, cancelling }
}
