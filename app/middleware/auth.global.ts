import { DEFAULT_AUTH_LANDING, safeRedirectPath } from '~/utils/safeRedirect'

const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/preview/offer',
  '/pay',
  '/save-card',
  '/invite'
]

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`)
  )
}

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  await auth.waitUntilInitialised()

  if (isPublicRoute(to.path)) {
    if (to.path === '/login' && auth.isAuthenticated) {
      return navigateTo(safeRedirectPath(to.query.redirect), { replace: true })
    }
    return
  }

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    }, { replace: true })
  }

  if (to.path === '/' || to.path === '') {
    return navigateTo(DEFAULT_AUTH_LANDING, { replace: true })
  }
})
