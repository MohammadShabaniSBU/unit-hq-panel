export const SETTINGS_LEGACY_REDIRECTS: Record<string, string> = {
  '/settings': '/settings/workspace/general',
  '/settings/general': '/settings/workspace/general',
  '/settings/people': '/settings/team/members',
  '/settings/roles': '/settings/team/roles',
  '/settings/legal-entities': '/settings/workspace/legal-entities',
  '/settings/billing': '/settings/billing/defaults',
  '/settings/payments': '/settings/workspace/legal-entities',
  '/settings/communications': '/settings/communication/email',
  '/settings/late-fees-liens': '/settings/billing/delinquency-policies',
  '/settings/tax-rates': '/settings/billing/tax-rates',
  '/settings/custom-attributes': '/settings/data-model/objects',
  '/settings/object-customization': '/settings/data-model/objects',
  '/settings/esign': '/settings/rentals/e-signature',
  '/settings/access': '/settings/facilities/access-control',
  '/settings/insights': '/settings/insights/sources',
  '/settings/ai-providers': '/settings/ai/providers',
  '/settings/ai-agents': '/settings/ai/agent-permissions',
  '/settings/facility/sites': '/settings/facilities/sites',
  '/settings/facility/discounts': '/settings/rentals/discounts',
  '/settings/facility/size-guides': '/settings/rentals/size-guide',
  '/settings/leasing': '/settings/rentals/offers-reservations',
  '/settings/activity-log': '/settings/compliance/activity-log',
  '/settings/stripe-connect': '/settings/workspace/legal-entities',
  '/settings/billing-rules': '/settings/billing/delinquency-policies'
}

const SETTINGS_LEGACY_PREFIXES: Array<[string, string]> = [
  ['/settings/roles/', '/settings/team/roles/'],
  ['/settings/legal-entities/', '/settings/workspace/legal-entities/'],
  ['/settings/facility/sites/', '/settings/facilities/sites/']
]

const SITE_TAB_RENAMES: Record<string, string> = {
  integrations: 'access-control',
  'voice-bridge': 'phone-numbers'
}

function remapQuery(path: string, query: Record<string, unknown>): Record<string, unknown> {
  const next = { ...query }
  const tab = next.tab
  if (typeof tab === 'string' && (path.includes('/sites/') || path === '/settings/facility/sites') && SITE_TAB_RENAMES[tab]) {
    next.tab = SITE_TAB_RENAMES[tab]
  }
  return next
}

export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/settings')) {
    return
  }

  const exact = SETTINGS_LEGACY_REDIRECTS[to.path]
  if (exact) {
    return navigateTo({ path: exact, query: remapQuery(to.path, to.query) }, { replace: true })
  }

  if (to.path.startsWith('/settings/object-customization/')) {
    const entity = to.path.slice('/settings/object-customization/'.length)
    if (entity) {
      return navigateTo({
        path: `/settings/data-model/objects/${entity}/layout`,
        query: to.query
      }, { replace: true })
    }
  }

  for (const [from, destination] of SETTINGS_LEGACY_PREFIXES) {
    if (to.path.startsWith(from)) {
      return navigateTo({
        path: `${destination}${to.path.slice(from.length)}`,
        query: remapQuery(to.path, to.query)
      }, { replace: true })
    }
  }
})
