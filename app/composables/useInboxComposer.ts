import type {
  ApiComposeContext,
  ApiInboxReplyResult,
  ApiInboxTemplateOption,
  ApiWhatsappComposeTemplate,
  InboxChannel
} from '~/types/inbox'

export interface StagedInboxAttachment {
  id: number
  filename: string
}

function isWhatsappTemplate(t: ApiInboxTemplateOption | ApiWhatsappComposeTemplate): t is ApiWhatsappComposeTemplate {
  return 'body' in t && 'resolved_variables' in t
}

/**
 * Reply composer: compose-context (identity honesty + suppression pre-flight),
 * attachment staging, template/token insertion, SMS segment math, and
 * session-aware WhatsApp modes (S11-01 / S13-04).
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

  // WhatsApp closed-window flow
  const waStep = ref<'choose' | 'fill'>('choose')
  const selectedWaTemplateId = ref<number | null>(null)
  const waVariableFills = ref<Array<string>>([])
  const nowTick = ref(Date.now())
  let tickTimer: ReturnType<typeof setInterval> | null = null

  const smsPreviewBody = computed(() => bodyText.value)
  const smsSegments = computed(() => {
    if (channel.value !== 'sms') {
      return null
    }
    return countSmsSegments(smsPreviewBody.value)
  })

  const whatsappWindow = computed(() => context.value?.whatsapp_window ?? null)
  const windowOpen = computed(() => channel.value === 'whatsapp' && whatsappWindow.value?.open === true)

  const countdownLabel = computed(() => {
    const closesAt = whatsappWindow.value?.closes_at
    if (!closesAt || !windowOpen.value) {
      return null
    }
    const ms = new Date(closesAt).getTime() - nowTick.value
    if (ms <= 0) {
      return { hours: 0, minutes: 0, expired: true }
    }
    const totalMinutes = Math.floor(ms / 60000)
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      expired: false
    }
  })

  const waTemplates = computed(() =>
    (context.value?.templates ?? []).filter(isWhatsappTemplate)
  )

  const selectedWaTemplate = computed(() =>
    waTemplates.value.find(t => t.id === selectedWaTemplateId.value) ?? null
  )

  const familyTemplates = computed(() =>
    (context.value?.templates ?? []).filter((t): t is ApiInboxTemplateOption => !isWhatsappTemplate(t))
  )

  const suppressionBlocksReply = computed(() => context.value?.suppression?.scope === 'all')
  const consentMissing = computed(() =>
    channel.value === 'whatsapp' && context.value?.whatsapp_consent?.has_channel === false
  )

  const canSend = computed(() => {
    if (channel.value === 'call') {
      return false
    }

    if (!context.value || context.value.from_identity === null) {
      return false
    }

    if (suppressionBlocksReply.value || consentMissing.value) {
      return false
    }

    if (sending.value) {
      return false
    }

    if (channel.value === 'whatsapp') {
      if (windowOpen.value && !countdownLabel.value?.expired) {
        return bodyText.value.trim().length > 0
      }
      return selectedWaTemplate.value !== null
        && waVariableFills.value.every(v => v.trim().length > 0)
    }

    if (channel.value === 'sms') {
      return bodyText.value.trim().length > 0 || selectedTemplateId.value !== null
    }

    return bodyText.value.trim().length > 0 && !sending.value
  })

  function reset() {
    bodyText.value = ''
    selectedTemplateId.value = null
    stagedAttachments.value = []
    sendError.value = null
    waStep.value = 'choose'
    selectedWaTemplateId.value = null
    waVariableFills.value = []
  }

  function startTick() {
    stopTick()
    tickTimer = setInterval(() => {
      nowTick.value = Date.now()
    }, 15000)
  }

  function stopTick() {
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  async function loadContext(id: number) {
    pendingContext.value = true
    contextError.value = null

    try {
      const response = await get<ApiComposeContext>(`/api/inbox/threads/${id}/compose-context`)
      context.value = response.data
      if (channel.value === 'whatsapp' && response.data.whatsapp_window?.open) {
        startTick()
      } else {
        stopTick()
      }
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

  function insertSnippet(snippet: string) {
    const separator = bodyText.value.length > 0 && !bodyText.value.endsWith('\n') ? '\n' : ''
    bodyText.value = `${bodyText.value}${separator}${snippet}`
  }

  function selectWaTemplate(template: ApiWhatsappComposeTemplate) {
    selectedWaTemplateId.value = template.id
    waVariableFills.value = [...(template.resolved_variables ?? [])]
    waStep.value = 'fill'
  }

  function clearWaTemplate() {
    selectedWaTemplateId.value = null
    waVariableFills.value = []
    waStep.value = 'choose'
  }

  async function sendReply(id: number): Promise<ApiInboxReplyResult | null> {
    sending.value = true
    sendError.value = null

    try {
      const payload: Record<string, unknown> = {}

      if (channel.value === 'whatsapp') {
        if (windowOpen.value && !countdownLabel.value?.expired) {
          payload.body_text = bodyText.value
        } else if (selectedWaTemplate.value) {
          payload.whatsapp_template_name = selectedWaTemplate.value.name
          payload.variables = [...waVariableFills.value]
        } else {
          return null
        }
      } else if (channel.value === 'sms') {
        if (selectedTemplateId.value !== null) {
          payload.template_family_id = selectedTemplateId.value
        } else {
          payload.body_text = bodyText.value
        }
      } else {
        payload.body_text = bodyText.value
        if (selectedTemplateId.value !== null) {
          payload.template_family_id = selectedTemplateId.value
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
      stopTick()
      if (id !== null) {
        loadContext(id)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => stopTick())

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
    consentMissing,
    canSend,
    windowOpen,
    countdownLabel,
    waStep,
    waTemplates,
    familyTemplates,
    selectedWaTemplate,
    waVariableFills,
    selectWaTemplate,
    clearWaTemplate,
    loadContext,
    uploadAttachment,
    removeAttachment,
    insertToken,
    insertSnippet,
    sendReply,
    reset
  }
}
