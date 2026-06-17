import type { ApiPaginatedResponse, ApiResponse } from '~/types/facility'

export function useApi() {
  const config = useRuntimeConfig()

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBaseUrl,
    onRequest({ options }) {
      // TODO: const token = useAuthStore().token
      // if (token) options.headers = { Authorization: `Bearer ${token}` }
    }
  })

  async function get<T>(url: string, query?: Record<string, string | number>) {
    return apiFetch<ApiResponse<T>>(url, { query })
  }

  async function getPaginated<T>(url: string, query?: Record<string, string | number>) {
    return apiFetch<ApiPaginatedResponse<T>>(url, { query })
  }

  async function post<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<T>>(url, { method: 'POST', body })
  }

  async function put<T>(url: string, body: Record<string, unknown>) {
    return apiFetch<ApiResponse<T>>(url, { method: 'PUT', body })
  }

  return {
    apiFetch,
    get,
    getPaginated,
    post,
    put
  }
}
