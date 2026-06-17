import type { ApiOption } from '~/types/facility'

export function useOptions(url: string) {
  const { get } = useApi()

  const { data, pending, error } = useAsyncData(
    `options:${url}`,
    () => get<ApiOption[]>(url)
  )

  const items = computed(() => data.value?.data ?? [])

  return { items, pending, error }
}
