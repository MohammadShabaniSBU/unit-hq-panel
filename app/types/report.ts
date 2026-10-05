export type ReportColumnType = 'money' | 'percent' | 'int' | 'date' | 'string'

export interface ReportColumn {
  key: string
  label: string
  type: ReportColumnType
  currency: string | null
}

export type ChartType
  = 'line'
    | 'area'
    | 'column'
    | 'stacked_column'
    | 'stacked_area'
    | 'bar'
    | 'combo'
    | 'donut'
    | 'heatmap'
    | 'funnel'

export type ChartFormat = 'int' | 'percent' | 'money' | 'area_m2' | 'days'

export type ChartCategoryKind = 'month' | 'label_key' | 'text'

export type ChartSeriesKind = 'column' | 'line' | 'area'

export type ChartWidth = 'full' | 'half'

export interface ChartSeries {
  name_key: string | null
  name: string | null
  data: Array<number | null>
  kind: ChartSeriesKind | null
  axis: 0 | 1
}

export interface ChartTarget {
  y: number
  label_key: string
}

export interface ChartSpec {
  key: string
  type: ChartType
  title_key: string
  description_key: string | null
  categories: Array<string>
  category_kind: ChartCategoryKind
  series: Array<ChartSeries>
  format: ChartFormat
  secondary_format: ChartFormat | null
  currency: string | null
  targets: Array<ChartTarget>
  percent_stacked: boolean
  width: ChartWidth
  empty: boolean
}

export interface ReportResult {
  columns: Array<ReportColumn>
  rows: Array<Record<string, string | number | null>>
  meta?: Record<string, unknown>
  charts?: Array<ChartSpec>
}

export interface ReportFilters {
  site_ids?: Array<number>
  from?: string
  to?: string
  as_of?: string
}

export interface ReportCatalogItem {
  name: string
  titleKey: string
  descriptionKey: string
  to: string
}

export type DashboardAttentionKey
  = 'failed_autopay'
    | 'drift_denied_but_granted'
    | 'signed_after_cancellation'
    | 'triage'
    | 'expiring_signatures'
    | 'pending_deposit_payouts'

export type DashboardCardKey
  = 'occupancy'
    | 'monthly_rent'
    | 'overdue'
    | 'open_delinquency_cases'
    | 'movement_net'

export interface DashboardCard {
  value: string | number | null
  secondary?: Record<string, string | number | null> | null
  delta: string | number | null
  currency: string | null
  to: string
  filters: Record<string, string | number | Array<number>>
}

export interface DashboardAttentionChip {
  key: DashboardAttentionKey
  count: number
  to: string
  filters: Record<string, string | number | Array<number>>
}

export interface OccupancyTrendPoint {
  month_end: string
  unit_rate: number | null
  economic_rate: number | null
}

export interface CollectionsTrendPoint {
  month: string
  charged: string
  allocated: string
  currency: string
}

export interface DashboardMeta {
  as_of: string
  prior_as_of: string
  cards: Record<DashboardCardKey, DashboardCard>
  trends: {
    occupancy: {
      series: Array<OccupancyTrendPoint>
      axis: string
      note: string
    }
    collections: {
      series: Array<CollectionsTrendPoint>
      axis: string
      note: string
    }
  }
  attention: Array<DashboardAttentionChip>
}
