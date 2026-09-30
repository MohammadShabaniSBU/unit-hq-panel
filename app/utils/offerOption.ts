import type { ApiOfferOption } from '~/types/offer'

export function offerOptionSiteName(option: ApiOfferOption): string | null {
  return option.unit_class_rate?.site?.name ?? null
}

export function offerOptionUnitClass(option: ApiOfferOption): string | null {
  return option.unit_class_rate?.unit_class?.label ?? null
}

export function offerOptionCurrency(option: ApiOfferOption): string {
  return option.unit_class_rate?.price?.currency ?? 'EUR'
}

/** Unit size in m², rounded to the nearest half, as a display string. */
export function offerOptionSize(option: ApiOfferOption): string | null {
  const raw = option.unit_class_rate?.unit_class?.size
  if (raw === null || raw === undefined || raw === '') return null
  const area = Number(raw)
  if (!Number.isFinite(area) || area <= 0) return null
  const rounded = Math.round(area * 2) / 2
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function offerOptionListAmount(option: ApiOfferOption): string | null {
  return option.unit_class_rate?.price?.amount ?? null
}

export function offerOptionFirstDiscountedAmount(option: ApiOfferOption): string | null {
  return option.discount_resolution?.discount_schedule?.segments?.[0]?.amount ?? null
}

export function offerOptionThereafterDiscountedAmount(option: ApiOfferOption): string | null {
  const segments = option.discount_resolution?.discount_schedule?.segments
  if (!segments?.length) return null
  return segments[segments.length - 1]?.amount ?? null
}

/** What the renter pays for the first period: the discounted first segment if any, else list price. */
export function offerOptionFirstPeriodAmount(option: ApiOfferOption): string | null {
  return offerOptionFirstDiscountedAmount(option) ?? offerOptionListAmount(option)
}
