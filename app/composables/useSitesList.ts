import type { Site, SiteSummary } from '~/types/facility'
import { mockSites } from '~/data/sites.mock'

function matchesSearch(site: Site, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    site.name,
    site.address
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useSitesList() {
  const searchQuery = ref('')

  const filteredSites = computed(() =>
    mockSites.filter(site => matchesSearch(site, searchQuery.value))
  )

  const summary = computed<SiteSummary>(() => {
    const sites = mockSites
    const totalUnits = sites.reduce((sum, site) => sum + site.totalUnits, 0)
    const vacantUnits = sites.reduce((sum, site) => sum + site.vacantUnits, 0)

    return {
      totalSites: sites.length,
      totalUnits,
      occupiedUnits: totalUnits - vacantUnits,
      totalRevenue: sites.reduce((sum, site) => sum + site.revenue, 0)
    }
  })

  return {
    searchQuery,
    sites: filteredSites,
    summary
  }
}

export function formatSiteRevenue(amount: number, compact = false) {
  if (compact && amount >= 1000) {
    return `£${(amount / 1000).toFixed(1)}k`
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatOccupancyPercent(percent: number) {
  return `${percent}%`
}

export const siteStatusLabels = {
  operational: 'Operational',
  maintenance: 'Maintenance'
} as const

export function occupancyBarColor(percent: number) {
  if (percent >= 85) {
    return 'bg-success'
  }

  if (percent >= 70) {
    return 'bg-warning'
  }

  return 'bg-neutral-400'
}
