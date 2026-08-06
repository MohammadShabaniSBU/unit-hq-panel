import type { AnalyticsProviderDescriptor } from '~/types/insights'

export function useAnalyticsProviders(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { get } = useApi()
  const enabled = computed(() => toValue(options.enabled ?? true))

  const { data, pending, error, refresh } = useAsyncData(
    'settings-analytics-providers',
    async () => {
      if (!enabled.value) {
        return { message: '', data: [] as Array<AnalyticsProviderDescriptor> }
      }
      return get<Array<AnalyticsProviderDescriptor>>('/api/settings/analytics-providers')
    },
    { watch: [enabled] }
  )

  const providers = computed(() => data.value?.data ?? [])

  return {
    providers,
    pending,
    error,
    refresh
  }
}
