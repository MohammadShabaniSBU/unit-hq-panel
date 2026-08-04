import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type TextPart = { type: 'text'; text: string }

export type ToolCallPart = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  status: 'calling' | 'done' | 'error'
  result?: Record<string, unknown>
}

interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  parts: Array<TextPart | ToolCallPart>
}

interface CopilotConversation {
  id: string
  title: string
  messages: Array<CopilotMessage>
  createdAt: string
}

const generateId = (): string => {
  return 'id_' + Math.random().toString(36).substr(2, 9)
}

function getMessageText(message: CopilotMessage): string {
  return message.parts.find(part => part.type === 'text')?.text ?? ''
}

function apiBase(): string {
  return useRuntimeConfig().public.apiBaseUrl as string
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = useAuthStore().token
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export const useCopilotStore = defineStore('copilot', () => {
  const isOpen = ref(false)
  const conversations = ref<Array<CopilotConversation>>([])
  const activeConversationId = ref<string | null>(null)
  const status = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
  const isLoading = ref(false)

  const toggle = () => { isOpen.value = !isOpen.value }
  const open = () => { isOpen.value = true }
  const close = () => { isOpen.value = false }

  const activeConversation = computed(() => {
    if (!activeConversationId.value) return null
    return conversations.value.find(c => c.id === activeConversationId.value) ?? null
  })

  const activeMessages = computed(() => activeConversation.value?.messages ?? [])

  const isBusy = computed(() => status.value === 'submitted' || status.value === 'streaming')

  async function fetchConversations() {
    isLoading.value = true
    try {
      const res = await fetch(`${apiBase()}/api/copilot/conversations`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as Array<{ id: string; title: string; created_at: string }>
      conversations.value = data.map(c => ({
        id: c.id,
        title: c.title,
        messages: [],
        createdAt: c.created_at,
      }))
    } catch (e) {
      console.error('Failed to fetch conversations', e)
    } finally {
      isLoading.value = false
    }
  }

  async function newConversation() {
    isLoading.value = true
    try {
      const res = await fetch(`${apiBase()}/api/copilot/conversations`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { id: string; title: string; created_at: string }
      const conversation: CopilotConversation = {
        id: data.id,
        title: data.title,
        messages: [],
        createdAt: data.created_at,
      }
      conversations.value.unshift(conversation)
      activeConversationId.value = data.id
    } catch (e) {
      console.error('Failed to create conversation', e)
    } finally {
      isLoading.value = false
    }
  }

  async function selectConversation(id: string) {
    activeConversationId.value = id
    const conv = conversations.value.find(c => c.id === id)
    if (!conv || conv.messages.length > 0) return

    isLoading.value = true
    try {
      const res = await fetch(`${apiBase()}/api/copilot/conversations/${id}`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as {
        id: string
        title: string
        created_at: string
        messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
      }
      conv.messages = data.messages.map(m => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
      }))
    } catch (e) {
      console.error('Failed to load conversation messages', e)
    } finally {
      isLoading.value = false
    }
  }

  async function syncMessages() {
    const conv = activeConversation.value
    if (!conv) return
    try {
      await fetch(`${apiBase()}/api/copilot/conversations/${conv.id}/messages`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: conv.title,
          messages: conv.messages.map(m => ({
            role: m.role,
            content: getMessageText(m),
          })),
        }),
      })
    } catch (e) {
      console.error('Failed to sync messages', e)
    }
  }

  function updateConversationTitle() {
    const conv = activeConversation.value
    if (!conv || conv.messages.length === 0) return
    const firstUser = conv.messages.find(m => m.role === 'user')
    if (firstUser) {
      const text = getMessageText(firstUser)
      conv.title = text.length > 50 ? text.substring(0, 50) + '...' : text
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim()) return

    if (!activeConversation.value) {
      await newConversation()
    }

    if (!activeConversation.value) return

    const userMessage: CopilotMessage = {
      id: generateId(),
      role: 'user',
      parts: [{ type: 'text', text: content }],
    }
    activeConversation.value.messages.push(userMessage)
    updateConversationTitle()

    status.value = 'submitted'

    const messagesForBackend = activeConversation.value.messages.map(m => ({
      role: m.role,
      content: getMessageText(m),
    }))

    const assistantMessage: CopilotMessage = {
      id: generateId(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    }
    activeConversation.value.messages.push(assistantMessage)
    const msgIdx = activeConversation.value.messages.length - 1

    try {
      const response = await fetch(`${apiBase()}/api/copilot/chat`, {
        method: 'POST',
        headers: authHeaders({
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        }),
        body: JSON.stringify({ messages: messagesForBackend }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      status.value = 'streaming'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const event = JSON.parse(payload) as {
              type?: string
              delta?: string
              toolCallId?: string
              toolName?: string
              output?: string
            }

            if (event.type === 'text-delta' && event.delta) {
              const msg = activeConversation.value?.messages[msgIdx]
              const part = msg?.parts[0]
              if (part && part.type === 'text') part.text += event.delta
            }

            if (event.type === 'tool-input-available') {
              const msg = activeConversation.value?.messages[msgIdx]
              if (msg) {
                msg.parts.push({
                  type: 'tool-call',
                  toolCallId: event.toolCallId ?? '',
                  toolName: event.toolName ?? '',
                  status: 'calling',
                })
              }
            }

            if (event.type === 'tool-output-available') {
              const msg = activeConversation.value?.messages[msgIdx]
              const part = msg?.parts.find(
                p => p.type === 'tool-call' && p.toolCallId === event.toolCallId,
              ) as ToolCallPart | undefined
              if (part) {
                part.status = 'done'
                try {
                  part.result = JSON.parse(event.output ?? '{}')
                } catch {
                  part.status = 'error'
                }
              }
            }
          } catch {
            // ignore malformed protocol lines
          }
        }
      }

      status.value = 'ready'
    } catch (error) {
      console.error('Failed to send message:', error)
      const errPart = activeConversation.value?.messages[msgIdx]?.parts[0]
      if (errPart) errPart.text = 'Sorry, I encountered an error. Please try again.'
      status.value = 'error'
    }

    await syncMessages()
  }

  function confirmPendingAction() {
    return sendMessage('Yes, proceed with the confirmed action')
  }

  function cancelPendingAction() {
    return sendMessage('No, cancel the pending action')
  }

  function registerShortcut() {
    if (!import.meta.client) return

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const isShortcutKey = isMac ? e.metaKey : e.ctrlKey

      if (isShortcutKey && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        toggle()
      }
    })
  }

  function reset() {
    isOpen.value = false
    conversations.value = []
    activeConversationId.value = null
    status.value = 'ready'
    isLoading.value = false
  }

  return {
    isOpen,
    conversations,
    activeConversationId,
    status,
    isBusy,
    isLoading,
    activeConversation,
    activeMessages,
    toggle,
    open,
    close,
    fetchConversations,
    newConversation,
    selectConversation,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    registerShortcut,
    reset
  }
})
