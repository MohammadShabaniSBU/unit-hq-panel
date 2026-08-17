import type { AiAgent, AiAgentsListResponse } from '~/types/agents'
import { Permission } from '~/types/permissions'

const AGENTS_KEY = 'ai-agents'

export function useAgentsDemoAvailable() {
  const { can } = usePermissions()
  const { apiFetch } = useApi()

  const allowed = computed(() => can(Permission.AiAgentUse))

  const { data, pending, error, refresh } = useAsyncData(
    AGENTS_KEY,
    () => apiFetch<AiAgentsListResponse>('/api/ai/agents'),
    { immediate: false }
  )

  watch(allowed, (on) => {
    if (on && !data.value && !pending.value) {
      void refresh()
    }
  }, { immediate: true })

  const demoOff = computed(() => data.value?.meta.demo_enabled === false)

  const navVisible = computed(() => allowed.value && !demoOff.value)

  const demoEnabled = computed(() => data.value?.meta.demo_enabled === true)

  return {
    demoOff,
    demoEnabled,
    navVisible,
    pending,
    error,
    refresh,
    agents: computed<Array<AiAgent>>(() => data.value?.data ?? [])
  }
}
