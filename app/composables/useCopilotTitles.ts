import { useAuthStore } from '~/stores/auth'
import { useCopilotStore } from '~/stores/copilot'

let started = false
let channelName: string | null = null

/**
 * Employee-scoped title updates. The answer stream stays on
 * private-copilot.{conversationId}; titles arrive on
 * private-copilot-titles.{employeeId}.
 */
export function useCopilotTitles() {
  const echo = useEcho()
  const copilot = useCopilotStore()
  const auth = useAuthStore()

  function unsubscribe() {
    if (!import.meta.client || !channelName) {
      return
    }

    echo.leave(channelName)
    channelName = null
  }

  function subscribe(employeeId: number) {
    if (!import.meta.client) {
      return
    }

    const next = `copilot-titles.${employeeId}`
    if (channelName === next) {
      return
    }

    unsubscribe()
    channelName = next

    echo.private(channelName).listen(
      '.copilot.conversation.titled',
      (payload: { conversation_id: string, title: string }) => {
        copilot.applyConversationTitle(payload.conversation_id, payload.title)
      }
    )
  }

  watch(() => auth.employee?.id ?? null, (id) => {
    if (!started) {
      return
    }

    if (id == null) {
      unsubscribe()
      return
    }

    subscribe(id)
  })

  function start() {
    if (started) {
      return
    }

    started = true
    const id = auth.employee?.id
    if (id != null) {
      subscribe(id)
    }
  }

  function stop() {
    unsubscribe()
    started = false
  }

  return { start, stop }
}
