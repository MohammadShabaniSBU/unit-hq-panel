import type { AiDemoPersona } from '~/types/agents'
import { isDemoDisabledError } from '~/utils/demoDisabled'

export function useDemoPersonaList(enabled: MaybeRefOrGetter<boolean>) {
  const { getPaginated } = useApi()
  const enabledRef = computed(() => toValue(enabled))

  const { data, pending, error, refresh } = useAsyncData(
    'ai-demo-personas',
    async () => {
      if (!enabledRef.value) {
        return null
      }

      return getPaginated<AiDemoPersona>('/api/ai/demo-personas', { per_page: 50 })
    },
    { watch: [enabledRef] }
  )

  const personas = computed<Array<AiDemoPersona>>(() => data.value?.data ?? [])
  const demoDisabled = computed(() => isDemoDisabledError(error.value))

  return { personas, pending, error, refresh, demoDisabled }
}
