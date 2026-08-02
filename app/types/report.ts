export type ReportColumnType = 'money' | 'percent' | 'int' | 'date' | 'string'

export interface ReportColumn {
  key: string
  label: string
  type: ReportColumnType
  currency: string | null
}

export interface ReportResult {
  columns: Array<ReportColumn>
  rows: Array<Record<string, string | number | null>>
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
