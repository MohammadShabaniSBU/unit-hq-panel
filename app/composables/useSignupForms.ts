import type { SignupForm, SignupFormPayload } from '~/types/signupForm'

export function useSignupForms() {
  const { get, post, put } = useApi()

  const forms = ref<Array<SignupForm>>([])
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
    pending,
    error,
    fetchForms,
    save,
    archive
  }
}
