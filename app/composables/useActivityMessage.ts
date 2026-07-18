import type { ApiActivity } from '~/types/activity'

/**
 * Resolve activity description machine keys to i18n strings with property interpolation.
 */
export function useActivityMessage() {
  const { t, te } = useI18n()

  function formatActivityMessage(activity: ApiActivity): string {
    const key = `activity.events.${activity.description}`
    const params = flattenParams(activity.properties ?? {})

    if (te(key)) {
      return t(key, params)
    }

    return activity.description
  }

  function flattenParams(properties: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (key === 'request_id') {
        continue
      }
      if (value === null || value === undefined) {
        params[key] = '—'
        continue
      }
      if (typeof value === 'object') {
        continue
      }
      params[key] = value
    }

    return params
  }

  return { formatActivityMessage }
}
