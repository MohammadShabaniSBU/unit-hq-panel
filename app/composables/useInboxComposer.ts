import type { ApiComposeContext, ApiInboxReplyResult, InboxChannel } from '~/types/inbox'

export interface StagedInboxAttachment {
  id: number
  filename: string
}

/**
 * Reply composer: compose-context (identity honesty + suppression pre-flight),
 * attachment staging, template/token insertion, and SMS segment math — the S11-01
 * write path surfaced in the S11-02 UI.
 */
export function useInboxComposer(threadId: Ref<number | null>, channel: Ref<InboxChannel | null>) {
  const { get, post, upload } = useApi()

  const context = ref<ApiComposeContext | null>(null)
  const pendingContext = ref(false)
  const contextError = ref<unknown>(null)

  const bodyText = ref('')
  const selectedTemplateId = ref<number | null>(null)
  const stagedAttachments = ref<Array<StagedInboxAttachment>>([])
  const uploading = ref(false)
  const sending = ref(false)
  const sendError = ref<string | null>(null)

  const smsSegments = computed(() => (channel.value === 'sms' ? countSmsSegments(bodyText.value) : null))

  const suppressionBlocksReply = computed(() => context.value?.suppression?.scope === 'all')

  const canSend = computed(() => {
    if (channel.value === 'call') {
      return false
    }

    if (!context.value || context.value.from_identity === null) {
      return false
    }

    if (suppressionBlocksReply.value) {
      return false
    }

    return bodyText.value.trim().length > 0 && !sending.value
  })

  function reset() {
    bodyText.value = ''
    selectedTemplateId.value = null
    stagedAttachments.value = []
    sendError.value = null
  }

  async function loadContext(id: number) {
    pendingContext.value = true
    contextError.value = null

    try {
      const response = await get<ApiComposeContext>(`/api/inbox/threads/${id}/compose-context`)
      context.value = response.data
    } catch (err) {
      contextError.value = err
    } finally {
      pendingContext.value = false
    }
  }

  async function uploadAttachment(file: File) {
    uploading.value = true

    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await upload<{ id: number }>('/api/inbox/attachments', formData)
      stagedAttachments.value = [...stagedAttachments.value, { id: response.data.id, filename: file.name }]
    } finally {
      uploading.value = false
    }
  }

  function removeAttachment(id: number) {
    stagedAttachments.value = stagedAttachments.value.filter(attachment => attachment.id !== id)
  }

  function insertToken(token: string) {
    bodyText.value = `${bodyText.value}{{${token}}}`
  }

  async function sendReply(id: number): Promise<ApiInboxReplyResult | null> {
    sending.value = true
    sendError.value = null

    try {
      const payload: Record<string, unknown> = { body_text: bodyText.value }

      if (channel.value === 'email') {
        if (selectedTemplateId.value !== null) {
          payload.email_template_id = selectedTemplateId.value
        }
        if (stagedAttachments.value.length > 0) {
          payload.attachment_ids = stagedAttachments.value.map(attachment => attachment.id)
        }
      }

      const response = await post<ApiInboxReplyResult>(`/api/inbox/threads/${id}/reply`, payload)
      reset()
      return response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      sendError.value = fetchError.data?.message ?? null
      return null
    } finally {
      sending.value = false
    }
  }

  watch(
    threadId,
    (id) => {
      reset()
      context.value = null
      if (id !== null) {
        loadContext(id)
      }
    },
    { immediate: true }
  )

  return {
    context,
    pendingContext,
    contextError,
    bodyText,
    selectedTemplateId,
    stagedAttachments,
    uploading,
    sending,
    sendError,
    smsSegments,
    suppressionBlocksReply,
    canSend,
    loadContext,
    uploadAttachment,
    removeAttachment,
    insertToken,
    sendReply,
    reset
  }
}
