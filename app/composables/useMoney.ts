import type { Money } from '~/types/money'

export type { Money }

export function formatMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string = 'en'
): string {
  if (!currency?.trim()) {
    console.warn('[formatMoney] Missing currency for amount', amount)
    return '—'
  }

  if (amount == null || amount === '') {
    return '—'
  }

  const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : amount

  if (Number.isNaN(numeric)) {
    return '—'
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.trim(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numeric)
  } catch {
    console.warn('[formatMoney] Invalid currency', currency)
    return '—'
  }
}

export function useMoney() {
  const { locale } = useI18n()

  function format(amount: string | number | null | undefined, currency: string | null | undefined) {
    return formatMoney(amount, currency, locale.value)
  }

  return {
    formatMoney: format
  }
}
