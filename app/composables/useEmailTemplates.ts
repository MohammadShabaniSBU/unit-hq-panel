import type { ApiEmailTemplate, EmailBlock } from '~/types/email-builder'

interface ApiTemplateVariant {
  id: number
  locale: string
  subject: string | null
  legacy_html: string | null
  body_text: string | null
  blocks: unknown
}

interface ApiTemplateFamily {
  id: number
  channel: string
  name: string
  purpose: string
  variants: Array<ApiTemplateVariant>
  created_at: string
  updated_at: string
}

const PAGE_SIZE = 20

function familyToTemplate(family: ApiTemplateFamily): ApiEmailTemplate {
  const variant = family.variants?.[0]
  const blocks: Array<EmailBlock> = []
  if (variant?.legacy_html) {
    blocks.push({
      id: 'legacy',
      type: 'text',
      props: {
        content: variant.legacy_html,
        align: 'left',
        fontSize: 16,
        color: '#000000'
      }
    })
  }

  return {
    id: family.id,
    name: family.name,
    blocks,
    created_at: family.created_at,
    updated_at: family.updated_at
  }
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

  const templates = computed(() => (data.value?.data ?? []).map(familyToTemplate))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function deleteTemplate(id: number) {
    try {
      await del(`/api/template-families/${id}`)
      toast.add({ title: t('forms.emailTemplate.deleteSuccessMessage'), color: 'success' })
      await refresh()
    } catch {
      toast.add({ title: t('forms.emailTemplate.deleteErrorMessage'), color: 'error' })
    }
  }

  return {
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

  const { data, pending, error } = useAsyncData(
    `template-family-${id}`,
    () => get<ApiTemplateFamily>(`/api/template-families/${id}`)
  )

  const template = computed(() => data.value?.data ? familyToTemplate(data.value.data) : null)

  return { template, pending, error }
}

export function useEmailTemplateCreate() {
  const { post } = useApi()
  const { t } = useI18n()
  const name = ref('')
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    name.value = ''
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(): Promise<ApiEmailTemplate | null> {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiTemplateFamily>('/api/template-families', {
        channel: 'email',
        name: name.value.trim(),
        locale: 'en',
        purpose: 'general'
      })
      reset()
      return familyToTemplate(response.data)
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.emailTemplate.createErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return { name, submitting, error, fieldErrors, reset, submit }
}

export function useEmailTemplateSave() {
  const { patch, put, get } = useApi()
  const { t } = useI18n()
  const saving = ref(false)
  const toast = useToast()

  async function save(id: number, payload: { name?: string, blocks?: Array<EmailBlock> }) {
    saving.value = true
    try {
      if (payload.name !== undefined) {
        await patch<ApiTemplateFamily>(`/api/template-families/${id}`, { name: payload.name })
      }

      if (payload.blocks !== undefined) {
        const family = await get<ApiTemplateFamily>(`/api/template-families/${id}`)
        const variant = family.data.variants?.[0]
        if (variant) {
          await put<ApiTemplateFamily>(`/api/template-families/${id}/variants/${variant.id}`, {
            locale: variant.locale,
            subject: payload.name ?? family.data.name,
            blocks: payload.blocks.map(block => ({
              type: block.type,
              props: block.props
            }))
          })
        }
      }

      const refreshed = await get<ApiTemplateFamily>(`/api/template-families/${id}`)
      toast.add({ title: t('forms.emailTemplate.saveSuccessMessage'), color: 'success' })
      return familyToTemplate(refreshed.data)
    } catch {
      toast.add({ title: t('forms.emailTemplate.saveErrorMessage'), color: 'error' })
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, save }
}
