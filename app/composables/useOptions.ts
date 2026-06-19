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

export function useSearchOptions(url: string, query: Ref<string>, minLength = 3) {
  const { get } = useApi()

  const { data, pending, error } = useAsyncData(
    () => `options:${url}:${query.value}`,
    async () => {
      if (query.value.length < minLength) {
        return null
      }

      return get<ApiOption[]>(url, { search: query.value })
    },
    { watch: [query] }
  )

  const items = computed(() => {
    if (query.value.length < minLength) {
      return []
    }

    return data.value?.data ?? []
  })

  return { items, pending, error }
}
