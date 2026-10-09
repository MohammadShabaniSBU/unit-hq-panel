import type { PublicSignupForm, SignupConfirmResult } from '~/types/signupForm'

export function usePublicSignupForm() {
  const { get, post } = useApi()

  const form = ref<PublicSignupForm | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)
  const submitError = ref<string | null>(null)
  const submitting = ref(false)

  async function fetchByToken(token: string, locale: string) {
    pending.value = true
    error.value = null

    try {
      const res = await get<PublicSignupForm>(`/api/public/forms/${encodeURIComponent(token)}`, { locale })
      form.value = res.data
    } catch (e) {
      error.value = e
      form.value = null
    } finally {
      pending.value = false
    }
  }

  async function submit(token: string, body: Record<string, unknown>) {
    submitting.value = true
    submitError.value = null

    try {
      await post<{ status: string }>(`/api/public/forms/${encodeURIComponent(token)}/submit`, body)
    } catch (e: unknown) {
      const fetchError = e as { data?: { message?: string } }
      submitError.value = fetchError.data?.message ?? null
      throw e
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    pending,
    error,
    submitError,
    submitting,
    fetchByToken,
    submit
  }
}

export function useSignupConfirmation() {
  const { get } = useApi()

  const result = ref<SignupConfirmResult | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)

  async function confirm(token: string) {
    pending.value = true
    error.value = null

    try {
      const res = await get<SignupConfirmResult>(`/api/public/forms/confirm/${encodeURIComponent(token)}`)
      result.value = res.data
    } catch (e) {
      error.value = e
      result.value = null
    } finally {
      pending.value = false
    }
  }

  return {
    result,
    pending,
    error,
    confirm
  }
}
