import type { AgentChannelBinding, AgentChannelBindingsListResponse } from '~/types/agents'
import { Permission } from '~/types/permissions'

export function useAgentBindingList() {
  const { can } = usePermissions()
  const { apiFetch } = useApi()

  const allowed = computed(() => can(Permission.AiAgentBindingManage))

  const { data, pending, error, refresh } = useAsyncData(
    'ai-agent-bindings',
    () => apiFetch<AgentChannelBindingsListResponse>('/api/ai/agents/bindings'),
    { immediate: false }
  )

  watch(allowed, (on) => {
    if (on && !data.value && !pending.value) {
      void refresh()
    }
  }, { immediate: true })

  const bindings = computed<Array<AgentChannelBinding>>(() => data.value?.data ?? [])

  return { bindings, pending, error, refresh, allowed }
}
