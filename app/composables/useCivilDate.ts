import { formatOrgDate } from '~/utils/orgDateFormat'

/**
 * Format a civil YYYY-MM-DD date for display without timezone shift.
 * Uses the org date-format setting. Never parse the ISO date string into a
 * local Date and reformat.
 */
export function formatCivilDate(value: string | null | undefined): string {
  return formatOrgDate(value, useBrandingStore().dateFormat, { withTime: false })
}

export function useCivilDate() {
  const { formatDate } = useOrgDateFormat()

  return {
    formatCivilDate: formatDate
  }
}
