import type { ApiMeta } from '~/types/facility'
import type { SignupForm, SignupFormPayload } from '~/types/signupForm'

const emptyMeta = (perPage = 25): ApiMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: perPage,
  total: 0
})

export function useSignupForms() {
  const { get, getPaginated, post, put } = useApi()

  const forms = ref<Array<SignupForm>>([])
  const meta = ref<ApiMeta>(emptyMeta())
  const pending = ref(false)
  const error = ref<unknown>(null)

  async function fetchForms() {
    pending.value = true
    error.value = null

    try {
      const res = await get<Array<SignupForm>>('/api/signup-forms')
      forms.value = res.data
    } catch (e) {
      error.value = e
      forms.value = []
    } finally {
      pending.value = false
    }
  }

  async function fetchPage(page: number, perPage: number) {
    pending.value = true
    error.value = null

    try {
      const res = await getPaginated<SignupForm>('/api/signup-forms', {
        page,
        per_page: perPage
      })
      forms.value = res.data
      meta.value = res.meta
    } catch (e) {
      error.value = e
      forms.value = []
      meta.value = emptyMeta(perPage)
    } finally {
      pending.value = false
    }
  }

  async function save(payload: SignupFormPayload, id?: number) {
    const body = payload as unknown as Record<string, unknown>
    if (id) {
      const res = await put<SignupForm>(`/api/signup-forms/${id}`, body)
      return res.data
    }

    const res = await post<SignupForm>('/api/signup-forms', body)
    return res.data
  }

  async function archive(id: number) {
    await post(`/api/signup-forms/${id}/archive`, {})
  }

  return {
    forms,
    meta,
    pending,
    error,
    fetchForms,
    fetchPage,
    save,
    archive
  }
}
