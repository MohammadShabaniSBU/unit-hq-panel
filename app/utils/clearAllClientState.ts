export function clearAllClientState() {
  useAuthStore().clearSession()
  useSiteContextStore().reset()
  useCopilotStore().reset()
  useInsightRegistryStore().reset()
}
