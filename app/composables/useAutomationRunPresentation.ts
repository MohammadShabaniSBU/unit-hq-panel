import type {
  AutomationCancelCause,
  AutomationRun,
  AutomationRunStatus,
  AutomationRunStepStatus
} from '~/types/automation'

export type RunStatusColor = 'success' | 'error' | 'warning' | 'info' | 'neutral'

export function useAutomationRunPresentation() {
  const { t } = useI18n()

  function statusColor(status: AutomationRunStatus | AutomationRunStepStatus): RunStatusColor {
    switch (status) {
      case 'succeeded':
        return 'success'
      case 'failed':
        return 'error'
      case 'running':
        return 'info'
      case 'waiting':
        return 'warning'
      case 'cancelled':
      case 'skipped':
      case 'pending':
      default:
        return 'neutral'
    }
  }

  function cancelCauseIcon(cause: AutomationCancelCause | null | undefined): string {
    switch (cause) {
      case 'manual':
        return 'i-lucide-hand'
      case 'guard':
        return 'i-lucide-shield'
      case 'superseded':
        return 'i-lucide-replace'
      case 'trigger_object_deleted':
        return 'i-lucide-trash-2'
      default:
        return 'i-lucide-ban'
    }
  }

  function formatRelativeParts(ms: number): string {
    const abs = Math.abs(ms)
    const totalMinutes = Math.floor(abs / 60_000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60

    const parts: Array<string> = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)
    return parts.slice(0, 2).join(' ')
  }

  function resumesIn(waitingUntil: string | null | undefined): string | null {
    if (!waitingUntil) return null
    const target = new Date(waitingUntil).getTime()
    if (Number.isNaN(target)) return null
    const delta = target - Date.now()
    if (delta <= 0) {
      return t('automations.runs.lifecycle.resumesSoon')
    }
    return t('automations.runs.lifecycle.resumesIn', { time: formatRelativeParts(delta) })
  }

  function waitedDuration(
    startedAt: string | null | undefined,
    completedAt: string | null | undefined,
    durationMs: number | null | undefined
  ): string | null {
    if (durationMs != null && durationMs >= 0) {
      return t('automations.runs.lifecycle.waited', { time: formatRelativeParts(durationMs) })
    }
    if (!startedAt || !completedAt) return null
    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
    return t('automations.runs.lifecycle.waited', { time: formatRelativeParts(end - start) })
  }

  function formatRunDuration(run: AutomationRun): string {
    if (run.status === 'waiting') {
      return resumesIn(run.waitingUntil) ?? t('automations.runs.durationRunning')
    }
    if (!run.startedAt || !run.completedAt) {
      return t('automations.runs.durationRunning')
    }
    const ms = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
    if (ms < 1000) return t('automations.runs.durationMs', { ms })
    return t('automations.runs.durationSeconds', { seconds: (ms / 1000).toFixed(1) })
  }

  function isCancellable(status: AutomationRunStatus): boolean {
    return status === 'pending' || status === 'running' || status === 'waiting'
  }

  function isTerminal(status: AutomationRunStatus): boolean {
    return status === 'succeeded' || status === 'failed' || status === 'cancelled'
  }

  return {
    statusColor,
    cancelCauseIcon,
    resumesIn,
    waitedDuration,
    formatRunDuration,
    isCancellable,
    isTerminal
  }
}
