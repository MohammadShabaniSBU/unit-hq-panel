/**
 * Format a civil YYYY-MM-DD date for display without timezone shift.
 * Never parse the ISO date string into a local Date and reformat.
 */
export function formatCivilDate(
  value: string | null | undefined,
  locale: string = 'en'
): string {
  if (!value) {
    return '—'
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return value
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(utc)
}

export function useCivilDate() {
  const { locale } = useI18n()

  function format(value: string | null | undefined) {
    return formatCivilDate(value, locale.value)
  }

  return {
    formatCivilDate: format
  }
}
