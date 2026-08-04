import type { ApiPaginatedResponse, ApiResponse } from '~/types/facility'
import type { ApiInboxCursorResponse } from '~/types/inbox'
import { clearAllClientState } from '~/utils/clearAllClientState'

let redirectingToLogin = false

function requestUrl(request: RequestInfo | string | URL | undefined): string {
  if (typeof request === 'string') {
    return request
  }
  if (request instanceof URL) {
    return request.href
  }
  if (request && typeof request === 'object' && 'url' in request) {
    return String(request.url)
  }
  return ''
}

export function useApi() {
  const config = useRuntimeConfig()

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl,
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json')
      }

      const token = useAuthStore().token
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      options.headers = headers
    },
    onResponseError({ request, response }) {
      if (response.status === 401) {
        const url = requestUrl(request)
        if (url.includes('/api/login')) {
          return
        }

        const auth = useAuthStore()
        if (auth.resolvingSession) {
          clearAllClientState()
          return
        }

        if (redirectingToLogin) {
          return
        }

        try {
          const route = useRoute()
          if (route.path === '/login') {
            clearAllClientState()
            return
          }

          redirectingToLogin = true
          clearAllClientState()
          const redirect = route.fullPath
          void Promise.resolve(navigateTo({
            path: '/login',
            query: { redirect }
          })).finally(() => {
            redirectingToLogin = false
          })
        } catch {
          clearAllClientState()
          redirectingToLogin = false
        }
        return
      }

      if (response.status !== 403) {
        return
      }

      const body = response._data as {
        data?: { permission?: string }
        message?: string
      } | undefined
      const permission = body?.data?.permission

      if (import.meta.dev) {
        console.error(
          '[rbac] 403 on a rendered control — panel should have hidden this action',
          permission ?? body?.message,
          response.url
        )
      }

      try {
        const { $i18n } = useNuxtApp()
        const toast = useToast()
        const t = $i18n.t.bind($i18n)
        const action = permission
          ? String(t(`permissions.${permission}`, permission))
          : String(t('errors.forbiddenGeneric'))

        toast.add({
          title: String(t('errors.forbiddenAction', { action })),
          color: 'error'
        })
      } catch {
        // Outside Nuxt context — skip toast.
      }
    }
  })

  async function get<T>(url: string, query?: Record<string, string | number>) {
    return apiFetch<ApiResponse<T>>(url, { query })
  }

  async function getPaginated<T>(url: string, query?: Record<string, string | number>) {
    return apiFetch<ApiPaginatedResponse<T>>(url, { query })
  }

  async function getCursor<T>(url: string, query?: Record<string, string | number>) {
    return apiFetch<ApiInboxCursorResponse<T>>(url, { query })
  }

  async function post<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<T>>(url, { method: 'POST', body })
  }

  async function upload<T>(url: string, formData: FormData) {
    return apiFetch<ApiResponse<T>>(url, { method: 'POST', body: formData })
  }

  async function downloadBlob(url: string) {
    return apiFetch<Blob>(url, { responseType: 'blob' })
  }

  async function postPaginated<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiPaginatedResponse<T>>(url, { method: 'POST', body })
  }

  async function put<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<T>>(url, { method: 'PUT', body })
  }

  async function patch<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<T>>(url, { method: 'PATCH', body })
  }

  async function del(url: string, body?: Record<string, unknown>) {
    return apiFetch<{ message: string }>(url, {
      method: 'DELETE',
      ...(body ? { body } : {})
    })
  }

  return {
    apiFetch,
    get,
    getPaginated,
    getCursor,
    post,
    upload,
    downloadBlob,
    postPaginated,
    put,
    patch,
    del
  }
}
