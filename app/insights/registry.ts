import type { Component } from 'vue'
import CatalogReport from '~/components/insights/native/CatalogReport.vue'
import DashboardReport from '~/components/insights/native/DashboardReport.vue'

/**
 * Panel-side native report registry, keyed by API `native_key`.
 * Mirrors `App\Support\Insights\NativeReports`.
 */
export const NativeReports: Record<string, Component> = {
  'dashboard': DashboardReport,
  'rent-roll': CatalogReport,
  'occupancy': CatalogReport,
  'ageing': CatalogReport,
  'collections': CatalogReport,
  'deposit-liability': CatalogReport,
  'daily-close': CatalogReport,
  'movement': CatalogReport,
  'funnel': CatalogReport,
  'demo': CatalogReport
}

export function resolveNativeReport(nativeKey: string | null | undefined): Component | null {
  if (!nativeKey) {
    return null
  }
  return NativeReports[nativeKey] ?? null
}
