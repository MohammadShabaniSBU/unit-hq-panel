import type { ApiUnit } from '~/types/facility'

export function formatUnitDimensions(unit: ApiUnit) {
  const width = unit.actual_width
  const depth = unit.actual_depth
  const height = unit.actual_height

  if (!width && !depth && !height) {
    return '—'
  }

  const parts = [width, depth, height].filter(Boolean)
  return `${parts.join(' × ')} m`
}

export function formatUnitSite(unit: ApiUnit) {
  return unit.site?.name ?? '—'
}

export function formatUnitClass(unit: ApiUnit) {
  if (!unit.unit_class) {
    return '—'
  }

  return `${unit.unit_class.code} — ${unit.unit_class.label}`
}
