import type { AiProviderDescriptor } from '~/types/ai'

export function useAiProviders(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { get } = useApi()
  const enabled = computed(() => toValue(options.enabled ?? true))

  const { data, pending, error, refresh } = useAsyncData(
    'settings-ai-providers',
    async () => {
      if (!enabled.value) {
        return { message: '', data: [] as Array<AiProviderDescriptor> }
      }
      return get<Array<AiProviderDescriptor>>('/api/settings/ai-providers')
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
