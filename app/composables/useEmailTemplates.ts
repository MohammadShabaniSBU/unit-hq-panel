import type { ApiEmailTemplate, EmailBlock } from '~/types/email-builder'

const PAGE_SIZE = 20

export function useEmailTemplatesList() {
  const { getPaginated, del } = useApi()
  const { t } = useI18n()
  const page = ref(1)
  const searchQuery = ref('')
  const toast = useToast()

  const { data, pending, error, refresh } = useAsyncData(
    'email-templates',
    () => getPaginated<ApiEmailTemplate>('/api/email-templates', {
      page: page.value,
      per_page: PAGE_SIZE,
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [page, searchQuery] }
  )

  watch(searchQuery, () => {
    page.value = 1
  })

  const templates = computed(() => data.value?.data ?? [])
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function deleteTemplate(id: number) {
    try {
      await del(`/api/email-templates/${id}`)
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
    `email-template-${id}`,
    () => get<ApiEmailTemplate>(`/api/email-templates/${id}`)
  )

  const template = computed(() => data.value?.data ?? null)

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
      const response = await post<ApiEmailTemplate>('/api/email-templates', { name: name.value.trim(), blocks: [] })
      reset()
      return response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string; errors?: Record<string, Array<string>> } }
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
  const { patch } = useApi()
  const { t } = useI18n()
  const saving = ref(false)
  const toast = useToast()

  async function save(id: number, payload: { name?: string; blocks?: Array<EmailBlock> }) {
    saving.value = true
    try {
      const response = await patch<ApiEmailTemplate>(`/api/email-templates/${id}`, payload as Record<string, unknown>)
      toast.add({ title: t('forms.emailTemplate.saveSuccessMessage'), color: 'success' })
      return response.data
    } catch {
      toast.add({ title: t('forms.emailTemplate.saveErrorMessage'), color: 'error' })
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, save }
}
