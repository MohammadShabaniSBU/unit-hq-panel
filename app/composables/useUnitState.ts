import type { UnitState } from '~/types/unit'

export type UnitStateBadgeColor = 'success' | 'info' | 'warning' | 'error' | 'neutral'

/** Badge colour intents — shared with map legend fills. */
export const unitStateBadgeColors: Record<UnitState, UnitStateBadgeColor> = {
  available: 'success',
  occupied: 'info',
  reserved: 'warning',
  maintenance: 'warning',
  damaged: 'error',
  staff_use: 'neutral',
  other: 'neutral'
}

/** SVG fill colours aligned with badge intents. */
export const unitStateFillColors: Record<UnitState | 'unknown', string> = {
  available: '#22c55e',
  occupied: '#3b82f6',
  reserved: '#fbbf24',
  maintenance: '#f59e0b',
  damaged: '#ef4444',
  staff_use: '#9ca3af',
  other: '#6b7280',
  unknown: '#d1d5db'
}

/** Tailwind bg classes for legend swatches (match fills above). */
export const unitStateLegendSwatches: Record<UnitState, string> = {
  available: 'bg-green-500',
  occupied: 'bg-blue-500',
  reserved: 'bg-amber-400',
  maintenance: 'bg-amber-500',
  damaged: 'bg-red-500',
  staff_use: 'bg-neutral-400',
  other: 'bg-neutral-500'
}

export function unitStateLabelKey(state: UnitState): string {
  return `units.state.${state}`
}

export function isOutOfServiceState(state: UnitState | null | undefined): boolean {
  return state === 'maintenance'
    || state === 'damaged'
    || state === 'staff_use'
    || state === 'other'
}

export function isHeldState(state: UnitState | null | undefined): boolean {
  return state === 'reserved' || isOutOfServiceState(state)
}
