import { hangUpCopilotVoice } from '~/composables/useVocalBridgeCopilot'

export function clearAllClientState() {
  void hangUpCopilotVoice('hangup')
  useAuthStore().clearSession()
  useSiteContextStore().reset()
  useCopilotStore().reset()
  useInsightRegistryStore().reset()
}
