import type { DateFormatPattern } from '~/utils/orgDateFormat'
import { formatOrgDate, formatOrgDateRange } from '~/utils/orgDateFormat'

export function useOrgDateFormat() {
  const branding = useBrandingStore()

  const dateFormat = computed(() => branding.dateFormat)

  function formatDate(
    value: string | null | undefined,
    options: { withTime?: boolean | 'auto', empty?: string } = {}
  ): string {
    return formatOrgDate(value, branding.dateFormat, { withTime: false, ...options })
  }

  function formatDateTime(
    value: string | null | undefined,
    options: { empty?: string } = {}
  ): string {
    return formatOrgDate(value, branding.dateFormat, { withTime: 'auto', ...options })
  }

  function formatRange(
    start: string | null | undefined,
    end: string | null | undefined,
    options: { withTime?: boolean | 'auto', empty?: string } = {}
  ): string {
    return formatOrgDateRange(start, end, branding.dateFormat, options)
  }

  return {
    dateFormat,
    formatDate,
    formatDateTime,
    formatRange
  }
}

export type { DateFormatPattern }
