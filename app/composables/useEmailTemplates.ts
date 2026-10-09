import type {
  ApiTemplateFamily,
  ApiTemplatePublishWarning,
  ApiTemplateVariant,
  ApiTemplateVersion,
  EmailBlock,
  EmailBlockDocument
} from '~/types/email-builder'
import { hydrateVariantDocument } from '~/types/email-builder'

export interface ApiTemplatePublishResponse {
  message: string
  data: ApiTemplateFamily
  warnings: Array<ApiTemplatePublishWarning>
}

function httpStatus(err: unknown): number {
  const fetchError = err as { statusCode?: number, status?: number, response?: { status?: number } }
  return fetchError.statusCode ?? fetchError.status ?? fetchError.response?.status ?? 0
}

export interface SampleContextItem {
  contact: {
    id: number
    name: string
    email: string | null
    locale: string | null
  }
  contracts: Array<{
    id: number
    currency: string
    status: string
  }>
}

export function useEmailTemplatesList(
  channel: 'email' | 'document' = 'email',
  options: { sendable?: boolean } = {}
) {
  const { getPaginated, del } = useApi()
  const { t } = useI18n()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()
  const searchQuery = ref('')
  const toast = useToast()
  const sendable = options.sendable === true

  const { data, pending, error, refresh } = useAsyncData(
    () => `template-families-${channel}-${page.value}-${perPage.value}-${searchQuery.value}-${sendable ? 'sendable' : 'all'}`,
    () => getPaginated<ApiTemplateFamily>('/api/template-families', {
      page: page.value,
      per_page: perPage.value,
      channel,
      ...(sendable ? { sendable: 1 } : {}),
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [page, perPage, searchQuery] }
  )

  watch(searchQuery, () => {
    resetPage()
  })

  const families = computed(() => data.value?.data ?? [])
  /** Playbook picker compatibility: id + name. */
  const templates = computed(() => families.value.map(f => ({ id: f.id, name: f.name })))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => families.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function deleteTemplate(id: number) {
    try {
      await del(`/api/template-families/${id}`)
      toast.add({ title: t('templates.builder.deleteSuccess'), color: 'success' })
      await refresh()
    } catch {
      toast.add({ title: t('templates.builder.deleteError'), color: 'error' })
    }
  }

  return {
    families,
    templates,
    totalCount,
    showingCount,
    lastPage,
    page,
    perPage,
    canGoPrev,
    canGoNext,
    searchQuery,
    pending,
    error,
    refresh,
    deleteTemplate,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}

export function useEmailTemplateGet(id: number | string) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `template-family-${id}`,
    () => get<ApiTemplateFamily>(`/api/template-families/${id}`)
  )

  const family = computed(() => data.value?.data ?? null)

  return { family, pending, error, refresh }
}

export function useEmailTemplateCreate(channel: 'email' | 'document' = 'email') {
  const { post } = useApi()
  const { t } = useI18n()
  const name = ref('')
  const purpose = ref(channel === 'document' ? 'contract' : 'general')
  const locale = ref('es')
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    name.value = ''
    purpose.value = channel === 'document' ? 'contract' : 'general'
    locale.value = 'es'
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(): Promise<ApiTemplateFamily | null> {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiTemplateFamily>('/api/template-families', {
        channel,
        name: name.value.trim(),
        locale: locale.value,
        purpose: purpose.value
      })
      reset()
      return response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('templates.builder.createError')
      return null
    } finally {
      submitting.value = false
    }
  }

  return { name, purpose, locale, submitting, error, fieldErrors, reset, submit }
}

export function useDocumentTemplatesList(options: { sendable?: boolean } = {}) {
  return useEmailTemplatesList('document', options)
}

export function useDocumentTemplateCreate() {
  return useEmailTemplateCreate('document')
}

export function useEmailTemplateEditor(familyId: number | string) {
  const { get, patch, put, post, del, upload, apiFetch } = useApi()
  const { t } = useI18n()
  const config = useRuntimeConfig()
  const toast = useToast()
  const saving = ref(false)

  async function saveFamilyName(name: string) {
    return patch<ApiTemplateFamily>(`/api/template-families/${familyId}`, { name })
  }

  async function saveVariant(
    variantId: number,
    payload: {
      subject?: string | null
      blocks?: EmailBlockDocument
      locale?: string
    }
  ) {
    saving.value = true
    try {
      const response = await put<ApiTemplateFamily>(
        `/api/template-families/${familyId}/variants/${variantId}`,
        {
          ...(payload.locale !== undefined ? { locale: payload.locale } : {}),
          ...(payload.subject !== undefined ? { subject: payload.subject } : {}),
          ...(payload.blocks !== undefined ? { blocks: payload.blocks } : {})
        }
      )
      toast.add({ title: t('templates.builder.saveSuccess'), color: 'success' })
      return response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('templates.builder.saveError'),
        color: 'error'
      })
      return null
    } finally {
      saving.value = false
    }
  }

  async function createVariant(locale: string, copyFromVariantId?: number) {
    const response = await post<ApiTemplateFamily>(
      `/api/template-families/${familyId}/variants`,
      {
        locale,
        ...(copyFromVariantId !== undefined
          ? { copy_from_variant_id: copyFromVariantId }
          : {})
      }
    )
    return response.data
  }

  async function deleteVariant(variantId: number) {
    await del(`/api/template-families/${familyId}/variants/${variantId}`)
    return get<ApiTemplateFamily>(`/api/template-families/${familyId}`)
  }

  async function fetchSampleContexts(): Promise<Array<SampleContextItem>> {
    const response = await get<Array<SampleContextItem>>('/api/template-builder/sample-contexts')
    return response.data
  }

  async function previewHtml(
    variantId: number,
    contactId: number,
    contractId?: number | null
  ): Promise<string> {
    const token = useAuthStore().token
    const html = await apiFetch<string>(
      `/api/template-families/${familyId}/variants/${variantId}/preview`,
      {
        method: 'POST',
        body: {
          contact_id: contactId,
          ...(contractId ? { contract_id: contractId } : {})
        },
        headers: {
          Accept: 'text/html',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        responseType: 'text'
      }
    )
    return html
  }

  async function testSend(payload: {
    variantId: number
    to: string
    contactId: number
    contractId?: number | null
  }) {
    return post<{ message_id: number | null, provider_message_id: string }>(
      `/api/template-families/${familyId}/variants/${payload.variantId}/test-send`,
      {
        to: payload.to,
        contact_id: payload.contactId,
        ...(payload.contractId ? { contract_id: payload.contractId } : {})
      }
    )
  }

  async function uploadAsset(file: File) {
    const form = new FormData()
    form.append('file', file)
    return upload<{
      id: number
      hash: string
      public_url: string
      original_filename: string
    }>('/api/template-assets', form)
  }

  function documentFromBlocks(blocks: Array<EmailBlock>): EmailBlockDocument {
    return { version: 1, blocks }
  }

  async function reloadFamily(): Promise<ApiTemplateFamily | null> {
    const family = await get<ApiTemplateFamily>(`/api/template-families/${familyId}`)
    return family.data
  }

  async function createDraft(fromVersionId?: number): Promise<ApiTemplateFamily | null> {
    const body: Record<string, unknown> = {}
    if (fromVersionId !== undefined) {
      body.from_version_id = fromVersionId
    }

    try {
      await post<ApiTemplateVersion>(`/api/template-families/${familyId}/versions`, body)
      return reloadFamily()
    } catch (err: unknown) {
      if (httpStatus(err) === 409) {
        return reloadFamily()
      }
      return null
    }
  }

  async function publishVersion(versionId: number): Promise<ApiTemplatePublishResponse | null> {
    try {
      return await apiFetch<ApiTemplatePublishResponse>(
        `/api/template-families/${familyId}/versions/${versionId}/publish`,
        { method: 'POST', body: {} }
      )
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('templates.builder.publishError'),
        color: 'error'
      })
      return null
    }
  }

  async function discardDraft(versionId: number): Promise<boolean> {
    try {
      await del(`/api/template-families/${familyId}/versions/${versionId}`)
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('templates.builder.discardError'),
        color: 'error'
      })
      return false
    }
  }

  async function fetchVersions(options?: { silent?: boolean }): Promise<Array<ApiTemplateVersion>> {
    try {
      const response = await get<Array<ApiTemplateVersion>>(`/api/template-families/${familyId}/versions`)
      return response.data
    } catch {
      if (!options?.silent) {
        toast.add({ title: t('templates.builder.historyLoadError'), color: 'error' })
      }
      return []
    }
  }

  async function fetchVersion(versionId: number): Promise<ApiTemplateVersion | null> {
    try {
      const response = await get<ApiTemplateVersion>(
        `/api/template-families/${familyId}/versions/${versionId}`
      )
      return response.data
    } catch {
      toast.add({ title: t('templates.builder.historyLoadError'), color: 'error' })
      return null
    }
  }

  return {
    saving,
    saveFamilyName,
    saveVariant,
    createVariant,
    deleteVariant,
    fetchSampleContexts,
    previewHtml,
    testSend,
    uploadAsset,
    documentFromBlocks,
    hydrateVariantDocument,
    createDraft,
    publishVersion,
    discardDraft,
    fetchVersions,
    fetchVersion,
    apiBaseUrl: config.public.apiBaseUrl as string
  }
}

export function useTemplateVersionControls(
  familyId: number | string,
  family: Readonly<Ref<ApiTemplateFamily | null>>,
  refresh: () => Promise<unknown>
) {
  const { t } = useI18n()
  const toast = useToast()
  const { createDraft, publishVersion, discardDraft, fetchVersions } = useEmailTemplateEditor(familyId)

  const publishing = ref(false)
  const discarding = ref(false)
  const openingDraft = ref(false)
  const publishWarnings = ref<Array<ApiTemplatePublishWarning>>([])
  const showHistory = ref(false)
  const basedOnNumber = ref<number | null>(null)

  const contentReadonly = computed(() =>
    family.value?.draft_version == null && family.value?.current_version != null
  )

  watch(family, async (current) => {
    const basedOn = current?.draft_version?.based_on_version_id
    if (!current || basedOn == null) {
      basedOnNumber.value = null
      return
    }
    if (current.current_version?.id === basedOn) {
      basedOnNumber.value = current.current_version.version_number
      return
    }
    const versions = await fetchVersions({ silent: true })
    basedOnNumber.value = versions.find(version => version.id === basedOn)?.version_number ?? null
  }, { immediate: true })

  async function edit() {
    openingDraft.value = true
    const opened = await createDraft()
    openingDraft.value = false
    if (!opened) {
      toast.add({ title: t('templates.builder.draftOpenError'), color: 'error' })
      return
    }
    await refresh()
  }

  async function publish() {
    const draftId = family.value?.draft_version?.id
    if (!draftId) return
    publishing.value = true
    const result = await publishVersion(draftId)
    if (result) {
      publishWarnings.value = result.warnings ?? []
      if (publishWarnings.value.length === 0) {
        toast.add({ title: t('templates.builder.publishSuccess'), color: 'success' })
      }
      await refresh()
    } else {
      publishWarnings.value = []
    }
    publishing.value = false
  }

  async function discard() {
    const draftId = family.value?.draft_version?.id
    if (!draftId) return
    discarding.value = true
    const discarded = await discardDraft(draftId)
    discarding.value = false
    if (!discarded) return
    toast.add({ title: t('templates.builder.discardSuccess'), color: 'success' })
    await refresh()
  }

  async function onRestored() {
    showHistory.value = false
    await refresh()
  }

  return {
    publishing,
    discarding,
    openingDraft,
    publishWarnings,
    showHistory,
    basedOnNumber,
    contentReadonly,
    edit,
    publish,
    discard,
    onRestored
  }
}

export type { ApiTemplateFamily, ApiTemplateVariant }
