import type { ApiTemplateFamily } from '~/types/email-builder'

const PAGE_SIZE = 50

export function useSmsTemplatesList() {
  const { getPaginated } = useApi()
  const page = ref(1)

  const { data, pending, error, refresh } = useAsyncData(
    'template-families-sms',
    () => getPaginated<ApiTemplateFamily>('/api/template-families', {
      page: page.value,
      per_page: PAGE_SIZE,
      channel: 'sms'
    }),
    { watch: [page] }
  )

  const families = computed(() => data.value?.data ?? [])
  const templates = computed(() => families.value.map(f => ({ id: f.id, name: f.name })))

  return {
    families,
    templates,
    pending,
    error,
    refresh,
    page
  }
}
