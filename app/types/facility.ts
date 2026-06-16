export type SiteStatus = 'operational' | 'maintenance'

export interface Site {
  id: string
  name: string
  address: string
  status: SiteStatus
  occupancyPercent: number
  totalUnits: number
  vacantUnits: number
  revenue: number
  integrations: string[]
}

export type UnitStatus = 'occupied' | 'vacant' | 'reserved' | 'maintenance'

export interface Unit {
  id: string
  name: string
  floor: string
  sizeM2: number
  type: string
  tenantName?: string
  status: UnitStatus
  moveInDate?: string
  rentPerMonth?: number
}

export type UnitStatusFilter = UnitStatus | 'all'

export interface UnitTabCounts {
  all: number
  occupied: number
  vacant: number
  reserved: number
  maintenance: number
}

export interface UnitClass {
  id: string
  name: string
  minM2: number
  maxM2: number
  totalUnits: number
  occupiedUnits: number
  minPrice: number
  maxPrice: number
  billingLabel: string
  features: string[]
}

export interface SiteSummary {
  totalSites: number
  totalUnits: number
  occupiedUnits: number
  totalRevenue: number
}
