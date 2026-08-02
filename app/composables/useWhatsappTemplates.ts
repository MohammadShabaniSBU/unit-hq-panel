import type {
  ApiWhatsappTemplate,
  WhatsappTemplatePayload,
  WhatsappTemplateStatus
} from '~/types/whatsapp-template'
import { groupTemplatesByName } from '~/types/whatsapp-template'

const PAGE_SIZE = 50

export function useWhatsappTemplatesList() {
  const { getPaginated, post } = useApi()
  const { t } = useI18n()
  const page = ref(1)
  const searchQuery = ref('')
  const statusFilter = ref<string>('active')
  const toast = useToast()

  const { data, pending, error, refresh } = useAsyncData(
    'whatsapp-templates',
    () => getPaginated<ApiWhatsappTemplate>('/api/whatsapp-templates', {
      page: page.value,
      per_page: PAGE_SIZE,
      status: statusFilter.value,
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [page, searchQuery, statusFilter] }
  )

  watch(searchQuery, () => {
    page.value = 1
  })

  watch(statusFilter, () => {
    page.value = 1
  })

  const templates = computed(() => data.value?.data ?? [])
  const groups = computed(() => groupTemplatesByName(templates.value))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function syncTemplates() {
    try {
      await post<{ updated: number }>('/api/whatsapp-templates/sync', {})
      toast.add({ title: t('templates.whatsapp.syncSuccess'), color: 'success' })
      await refresh()
    } catch {
      toast.add({ title: t('templates.whatsapp.syncError'), color: 'error' })
    }
  }

  async function archiveTemplate(id: number) {
    try {
      await post<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}/archive`, {})
      toast.add({ title: t('templates.whatsapp.archiveSuccess'), color: 'success' })
      await refresh()
    } catch {
      toast.add({ title: t('templates.whatsapp.archiveError'), color: 'error' })
    }
  }

  return {
    templates,
    groups,
    totalCount,
    lastPage,
    page,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    searchQuery,
    statusFilter,
    pending,
    error,
    refresh,
    syncTemplates,
    archiveTemplate
  }
}

export function useWhatsappTemplateGet(id: number | string) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `whatsapp-template-${id}`,
    () => get<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}`)
  )

  const template = computed(() => data.value?.data ?? null)

  return { template, pending, error, refresh }
}

export function useWhatsappTemplateCreate() {
  const { post } = useApi()
  const { t } = useI18n()
  const name = ref('')
  const language = ref('es')
  const category = ref<'utility' | 'marketing' | 'authentication'>('utility')
  const saving = ref(false)
  const toast = useToast()

  async function create(): Promise<number | null> {
    if (!name.value.trim()) {
      toast.add({ title: t('templates.whatsapp.nameRequired'), color: 'error' })
      return null
    }
    saving.value = true
    try {
      const res = await post<ApiWhatsappTemplate>('/api/whatsapp-templates', {
        name: name.value.trim().toLowerCase().replace(/\s+/g, '_'),
        language: language.value,
        category: category.value,
        body: 'Hola {{1}}',
        variables: [{
          index: 1,
          label: t('templates.whatsapp.defaultVariableLabel'),
          token_default: 'contact.first_name',
          sample: 'María'
        }]
      })
      toast.add({ title: t('templates.whatsapp.createSuccess'), color: 'success' })
      return res.data.id
    } catch {
      toast.add({ title: t('templates.whatsapp.createError'), color: 'error' })
      return null
    } finally {
      saving.value = false
    }
  }

  return { name, language, category, saving, create }
}

export function useWhatsappTemplateEditor(id: number | string) {
  const { get, put, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const saving = ref(false)
  const submitting = ref(false)

  const form = reactive<WhatsappTemplatePayload>({
    name: '',
    language: 'es',
    category: 'utility',
    header_text: null,
    body: '',
    footer_text: null,
    buttons: null,
    variables: []
  })

  const status = ref<WhatsappTemplateStatus>('draft')
  const rejectionReason = ref<string | null>(null)
  const submittedAt = ref<string | null>(null)
  const decidedAt = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    `whatsapp-template-editor-${id}`,
    () => get<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}`)
  )

  watch(data, (res) => {
    const row = res?.data
    if (!row) return
    form.name = row.name
    form.language = row.language
    form.category = row.category
    form.header_text = row.header_text
    form.body = row.body
    form.footer_text = row.footer_text
    form.buttons = row.buttons
    form.variables = row.variables ?? []
    status.value = row.status
    rejectionReason.value = row.rejection_reason
    submittedAt.value = row.submitted_at
    decidedAt.value = row.decided_at
  }, { immediate: true })

  const editable = computed(() => status.value === 'draft' || status.value === 'rejected')

  async function save(): Promise<boolean> {
    saving.value = true
    try {
      await put<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}`, {
        name: form.name,
        language: form.language,
        category: form.category,
        header_text: form.header_text,
        body: form.body,
        footer_text: form.footer_text,
        buttons: form.buttons,
        variables: form.variables
      })
      toast.add({ title: t('templates.whatsapp.saveSuccess'), color: 'success' })
      await refresh()
      return true
    } catch {
      toast.add({ title: t('templates.whatsapp.saveError'), color: 'error' })
      return false
    } finally {
      saving.value = false
    }
  }

  async function submit(): Promise<boolean> {
    submitting.value = true
    try {
      if (editable.value) {
        const ok = await save()
        if (!ok) return false
      }
      await post<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}/submit`, {})
      toast.add({ title: t('templates.whatsapp.submitSuccess'), color: 'success' })
      await refresh()
      return true
    } catch {
      toast.add({ title: t('templates.whatsapp.submitError'), color: 'error' })
      return false
    } finally {
      submitting.value = false
    }
  }

  async function cloneTemplate(): Promise<number | null> {
    try {
      const res = await post<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}/clone`, {})
      toast.add({ title: t('templates.whatsapp.cloneSuccess'), color: 'success' })
      return res.data.id
    } catch {
      toast.add({ title: t('templates.whatsapp.cloneError'), color: 'error' })
      return null
    }
  }

  async function archive(): Promise<boolean> {
    try {
      await post<ApiWhatsappTemplate>(`/api/whatsapp-templates/${id}/archive`, {})
      toast.add({ title: t('templates.whatsapp.archiveSuccess'), color: 'success' })
      return true
    } catch {
      toast.add({ title: t('templates.whatsapp.archiveError'), color: 'error' })
      return false
    }
  }

  return {
    form,
    status,
    rejectionReason,
    submittedAt,
    decidedAt,
    editable,
    pending,
    error,
    saving,
    submitting,
    refresh,
    save,
    submit,
    cloneTemplate,
    archive
  }
}
