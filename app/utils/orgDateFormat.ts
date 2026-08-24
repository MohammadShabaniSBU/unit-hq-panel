export type DateFormatPattern = 'd/m/y' | 'm/d/y' | 'd-m-y'

export const DATE_FORMAT_PATTERNS: Array<DateFormatPattern> = ['d/m/y', 'm/d/y', 'd-m-y']

export const DEFAULT_DATE_FORMAT: DateFormatPattern = 'd/m/y'

export function isDateFormatPattern(value: unknown): value is DateFormatPattern {
  return typeof value === 'string' && DATE_FORMAT_PATTERNS.includes(value as DateFormatPattern)
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function assemble(year: number, month: number, day: number, format: DateFormatPattern): string {
  const d = pad(day)
  const m = pad(month)
  const y = String(year)

  switch (format) {
    case 'm/d/y':
      return `${m}/${d}/${y}`
    case 'd-m-y':
      return `${d}-${m}-${y}`
    default:
      return `${d}/${m}/${y}`
  }
}

const CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/

export function formatOrgDate(
  value: string | null | undefined,
  format: DateFormatPattern = DEFAULT_DATE_FORMAT,
  options: { withTime?: boolean | 'auto', empty?: string } = {}
): string {
  const empty = options.empty ?? '—'
  if (!value) {
    return empty
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return empty
  }

  const resolved = isDateFormatPattern(format) ? format : DEFAULT_DATE_FORMAT
  const withTime = options.withTime ?? 'auto'

  const civil = CIVIL.exec(trimmed)
  if (civil) {
    return assemble(Number(civil[1]), Number(civil[2]), Number(civil[3]), resolved)
  }

  const dateTime = DATE_TIME.exec(trimmed)
  if (dateTime) {
    const date = assemble(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]), resolved)
    const includeTime = withTime === true || withTime === 'auto'
    if (!includeTime) {
      return date
    }

    return `${date} ${dateTime[4]}:${dateTime[5]}`
  }

  return trimmed
}

export function formatOrgDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  format: DateFormatPattern = DEFAULT_DATE_FORMAT,
  options: { withTime?: boolean | 'auto', empty?: string } = {}
): string {
  const empty = options.empty ?? '—'
  const from = formatOrgDate(start, format, { ...options, empty: '' })
  const to = formatOrgDate(end, format, { ...options, empty: '' })

  if (!from && !to) {
    return empty
  }

  if (!from || !to) {
    return from || to
  }

  return `${from} – ${to}`
}
