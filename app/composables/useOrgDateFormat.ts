import { formatOrgDate, formatOrgDateRange, toDateFieldLocale } from '~/utils/orgDateFormat'

export function useOrgDateFormat() {
  const branding = useBrandingStore()
  const { locale: uiLocale } = useI18n()

  const dateFormat = computed(() => branding.dateFormat)
  const dateFieldLocale = computed(() => toDateFieldLocale(branding.dateFormat, uiLocale.value))

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
    dateFieldLocale,
    formatDate,
    formatDateTime,
    formatRange
  }
}
