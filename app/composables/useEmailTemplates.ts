import type {
  ApiTemplateFamily,
  ApiTemplateVariant,
  EmailBlock,
  EmailBlockDocument
} from '~/types/email-builder'
import { hydrateVariantDocument } from '~/types/email-builder'

const PAGE_SIZE = 20

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

export function useEmailTemplatesList() {
  const { getPaginated, del } = useApi()
  const { t } = useI18n()
  const page = ref(1)
  const searchQuery = ref('')
  const toast = useToast()

  const { data, pending, error, refresh } = useAsyncData(
    'template-families-email',
    () => getPaginated<ApiTemplateFamily>('/api/template-families', {
      page: page.value,
      per_page: PAGE_SIZE,
      channel: 'email',
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [page, searchQuery] }
  )

  watch(searchQuery, () => {
    page.value = 1
  })

  const families = computed(() => data.value?.data ?? [])
  /** Playbook picker compatibility: id + name. */
  const templates = computed(() => families.value.map(f => ({ id: f.id, name: f.name })))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
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
    lastPage,
    page,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    searchQuery,
    pending,
    error,
    refresh,
    deleteTemplate
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

export function useEmailTemplateCreate() {
  const { post } = useApi()
  const { t } = useI18n()
  const name = ref('')
  const purpose = ref('general')
  const locale = ref('es')
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    name.value = ''
    purpose.value = 'general'
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
        channel: 'email',
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
    apiBaseUrl: config.public.apiBaseUrl as string
  }
}

export type { ApiTemplateFamily, ApiTemplateVariant }
