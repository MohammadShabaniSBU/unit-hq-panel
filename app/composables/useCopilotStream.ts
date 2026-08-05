import type { Ref } from 'vue'
import type { CopilotStreamEvent } from '~/types/copilot'
import { useCopilotStore } from '~/stores/copilot'

/**
 * Subscribes to private-copilot.{id} and forwards SDK / app broadcast events
 * into the copilot Pinia store. Lifecycle is tied to the conversation id ref.
 */
export function useCopilotStream(conversationId: Ref<string | null>) {
  const store = useCopilotStore()
  const echo = useEcho()

  let channelName: string | null = null
  let reconnectHandler: (() => void) | null = null

  function unsubscribe() {
    if (channelName) {
      echo.leave(channelName)
      channelName = null
    }

    if (reconnectHandler) {
      const pusher = echo.connector?.pusher
      pusher?.connection?.unbind('connected', reconnectHandler)
      reconnectHandler = null
    }
  }

  function handleEvent(event: CopilotStreamEvent) {
    store.applyStreamEvent(event)
  }

  function subscribe(id: string) {
    unsubscribe()

    channelName = `copilot.${id}`
    const channel = echo.private(channelName)

    channel.listen('.stream_start', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'stream_start' }))
    channel.listen('.text_delta', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'text_delta' }))
    channel.listen('.text_end', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'text_end' }))
    channel.listen('.stream_end', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'stream_end' }))
    channel.listen('.tool_approval_request', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'tool_approval_request' }))
    channel.listen('.stream_failed', (payload: CopilotStreamEvent) => handleEvent({ ...payload, type: 'stream_failed' }))
    channel.listen('.copilot.failed', (payload: Omit<Extract<CopilotStreamEvent, { type: 'copilot.failed' }>, 'type'>) => {
      handleEvent({ ...payload, type: 'copilot.failed' })
    })
    channel.listen('.copilot.tool_invoking', (payload: Omit<Extract<CopilotStreamEvent, { type: 'copilot.tool_invoking' }>, 'type'>) => {
      handleEvent({ ...payload, type: 'copilot.tool_invoking' })
    })

    const pusher = echo.connector?.pusher
    if (pusher?.connection) {
      reconnectHandler = () => {
        void store.reloadActiveConversation()
      }
      pusher.connection.bind('connected', reconnectHandler)
    }
  }

  watch(
    conversationId,
    (id) => {
      if (!id) {
        unsubscribe()
        return
      }
      subscribe(id)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    unsubscribe()
  })

  return {
    status: computed(() => store.status),
    pendingApprovals: computed(() => store.pendingApprovals),
    error: computed(() => store.streamError)
  }
}
