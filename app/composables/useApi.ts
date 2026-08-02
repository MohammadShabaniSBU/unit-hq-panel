import type { ApiPaginatedResponse, ApiResponse } from '~/types/facility'
import type { ApiInboxCursorResponse } from '~/types/inbox'

export function useApi() {
  const config = useRuntimeConfig()

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl,
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Accept', 'application/json')

      const token = useAuthStore().token
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      options.headers = headers
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

  async function del(url: string) {
    return apiFetch<{ message: string }>(url, { method: 'DELETE' })
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
