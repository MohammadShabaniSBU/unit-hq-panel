import type { ApiUnitClassOccupancyMatrixCell } from '~/types/facility'

export const OCCUPANCY_BELOW_MAX = 70
export const OCCUPANCY_WATCH_MIN = 70
export const OCCUPANCY_WATCH_MAX = 84
export const OCCUPANCY_TARGET_MIN = 85
export const OCCUPANCY_TARGET_MAX = 94
export const OCCUPANCY_HEADROOM_MIN = 95

export const ALL_SITES_HEADER_CLASS = 'bg-occ-header text-white'

export type OccupancyBandKey = 'below' | 'watch' | 'target' | 'headroom' | 'none'

export type OccupancyCellVariant = 'data' | 'total' | 'summary' | 'corner'

export interface OccupancyBand {
  key: OccupancyBandKey
  labelKey: string
  cell: string
  total: string
  summary: string
  corner: string
  swatch: string
}

export interface OccupancyCounts {
  total: number
  rentable: number
  occupied: number
  held_blocking: number
  free: number
  offered: boolean
}

const BAND_STYLES = {
  below: {
    key: 'below',
    labelKey: 'pages.unitClasses.matrix.bands.below',
    cell: 'bg-occ-below text-occ-below-ink dark:bg-occ-below-dark dark:text-occ-below-dark-ink',
    total: 'bg-occ-below-strong text-occ-below-ink dark:bg-occ-below-strong-dark dark:text-occ-below-dark-ink',
    summary: 'bg-occ-below text-occ-below-ink ring-2 ring-inset ring-occ-below-ring dark:bg-occ-below-dark dark:text-occ-below-dark-ink dark:ring-occ-below',
    corner: 'bg-occ-below-strong text-occ-below-ink ring-2 ring-inset ring-occ-below-strong-ring dark:bg-occ-below-strong-dark dark:text-occ-below-dark-ink dark:ring-occ-below',
    swatch: 'bg-occ-below dark:bg-occ-below-dark'
  },
  watch: {
    key: 'watch',
    labelKey: 'pages.unitClasses.matrix.bands.watch',
    cell: 'bg-occ-watch text-occ-watch-ink dark:bg-occ-watch-dark dark:text-occ-watch-dark-ink',
    total: 'bg-occ-watch-strong text-occ-watch-ink dark:bg-occ-watch-strong-dark dark:text-occ-watch-dark-ink',
    summary: 'bg-occ-watch text-occ-watch-ink ring-2 ring-inset ring-occ-watch-ring dark:bg-occ-watch-dark dark:text-occ-watch-dark-ink dark:ring-occ-watch',
    corner: 'bg-occ-watch-strong text-occ-watch-ink ring-2 ring-inset ring-occ-watch-strong-ring dark:bg-occ-watch-strong-dark dark:text-occ-watch-dark-ink dark:ring-occ-watch',
    swatch: 'bg-occ-watch dark:bg-occ-watch-dark'
  },
  target: {
    key: 'target',
    labelKey: 'pages.unitClasses.matrix.bands.target',
    cell: 'bg-occ-target text-occ-target-ink dark:bg-occ-target-dark dark:text-occ-target-dark-ink',
    total: 'bg-occ-target-strong text-occ-target-ink dark:bg-occ-target-strong-dark dark:text-occ-target-dark-ink',
    summary: 'bg-occ-target text-occ-target-ink ring-2 ring-inset ring-occ-target-ring dark:bg-occ-target-dark dark:text-occ-target-dark-ink dark:ring-occ-target',
    corner: 'bg-occ-target-strong text-occ-target-ink ring-2 ring-inset ring-occ-target-strong-ring dark:bg-occ-target-strong-dark dark:text-occ-target-dark-ink dark:ring-occ-target',
    swatch: 'bg-occ-target dark:bg-occ-target-dark'
  },
  headroom: {
    key: 'headroom',
    labelKey: 'pages.unitClasses.matrix.bands.headroom',
    cell: 'bg-occ-headroom text-occ-headroom-ink dark:bg-occ-headroom-dark dark:text-occ-headroom-dark-ink',
    total: 'bg-occ-headroom-strong text-occ-headroom-ink dark:bg-occ-headroom-strong-dark dark:text-occ-headroom-dark-ink',
    summary: 'bg-occ-headroom text-occ-headroom-ink ring-2 ring-inset ring-occ-headroom-ring dark:bg-occ-headroom-dark dark:text-occ-headroom-dark-ink dark:ring-occ-headroom',
    corner: 'bg-occ-headroom-strong text-occ-headroom-ink ring-2 ring-inset ring-occ-headroom-strong-ring dark:bg-occ-headroom-strong-dark dark:text-occ-headroom-dark-ink dark:ring-occ-headroom',
    swatch: 'bg-occ-headroom dark:bg-occ-headroom-dark'
  },
  none: {
    key: 'none',
    labelKey: 'pages.unitClasses.matrix.bands.none',
    cell: 'border border-dashed border-default bg-transparent text-muted',
    total: 'border border-dashed border-default bg-transparent text-muted',
    summary: 'border border-dashed border-default bg-transparent text-muted ring-2 ring-inset ring-default',
    corner: 'border border-dashed border-default bg-transparent text-muted ring-2 ring-inset ring-default',
    swatch: 'border border-dashed border-default bg-transparent'
  }
} satisfies Record<OccupancyBandKey, OccupancyBand>

export const OCCUPANCY_BANDS: Array<OccupancyBand> = [
  BAND_STYLES.below,
  BAND_STYLES.watch,
  BAND_STYLES.target,
  BAND_STYLES.headroom,
  BAND_STYLES.none
]

export function bandFor(occupied: number, rentable: number): OccupancyBandKey {
  if (rentable <= 0) {
    return 'none'
  }

  const ratio = occupied / rentable

  if (ratio < OCCUPANCY_BELOW_MAX / 100) {
    return 'below'
  }

  if (ratio < OCCUPANCY_TARGET_MIN / 100) {
    return 'watch'
  }

  if (ratio < OCCUPANCY_HEADROOM_MIN / 100) {
    return 'target'
  }

  return 'headroom'
}

export function bandStyle(key: OccupancyBandKey): OccupancyBand {
  return BAND_STYLES[key]
}

export function bandClasses(key: OccupancyBandKey, variant: OccupancyCellVariant): string {
  const band = BAND_STYLES[key]

  if (variant === 'total') {
    return band.total
  }

  if (variant === 'summary') {
    return band.summary
  }

  if (variant === 'corner') {
    return band.corner
  }

  return band.cell
}

export function percentOf(occupied: number, rentable: number): number | null {
  if (rentable <= 0) {
    return null
  }

  return (occupied / rentable) * 100
}

export function emptyCounts(): OccupancyCounts {
  return {
    total: 0,
    rentable: 0,
    occupied: 0,
    held_blocking: 0,
    free: 0,
    offered: false
  }
}

export function sumCounts(cells: Array<ApiUnitClassOccupancyMatrixCell>): OccupancyCounts {
  return cells.reduce((acc, cell) => ({
    total: acc.total + cell.total,
    rentable: acc.rentable + cell.rentable,
    occupied: acc.occupied + cell.occupied,
    held_blocking: acc.held_blocking + cell.held_blocking,
    free: acc.free + cell.free,
    offered: acc.offered || cell.offered
  }), emptyCounts())
}
