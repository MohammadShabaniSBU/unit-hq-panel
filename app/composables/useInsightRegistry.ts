import { resolveInsightLabel } from '~/types/insights'

export function useInsightRegistry() {
  const store = useInsightRegistryStore()
  const { t } = useI18n()

  async function ensureLoaded(): Promise<void> {
    if (store.loaded) {
      return
    }
    await store.fetch()
  }

  function labelFor(item: { label: string, label_source: 'i18n' | 'operator' }): string {
    return resolveInsightLabel(item, t)
  }

  return {
    items: computed(() => store.items),
    pending: computed(() => store.pending),
    error: computed(() => store.error),
    loaded: computed(() => store.loaded),
    fetch: () => store.fetch(),
    refresh: () => store.refresh(),
    byKey: (key: string) => store.byKey(key),
    dashboardItem: () => store.dashboardItem(),
    ensureLoaded,
    labelFor,
    reset: () => store.reset()
  }
}
