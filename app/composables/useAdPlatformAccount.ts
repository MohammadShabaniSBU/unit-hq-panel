import type {
  AdPlatformAccount,
  GoogleCustomer,
  TagProbe
} from '~/types/advertising'

export function useAdPlatformAccount() {
  const { get, post, put } = useApi()

  async function connectMeta(body: {
    name: string
    external_account_id: string
    system_user_token: string
    pixel_id: string
    capi_token: string
  }) {
    const response = await post<AdPlatformAccount>('/api/ad-platform-accounts', {
      provider: 'meta',
      name: body.name,
      external_account_id: body.external_account_id,
      credentials: {
        system_user_token: body.system_user_token,
        pixel_id: body.pixel_id,
        capi_token: body.capi_token
      }
    })
    return response.data
  }

  async function updateAccount(id: number, body: Record<string, unknown>) {
    const response = await put<AdPlatformAccount>(`/api/ad-platform-accounts/${id}`, body)
    return response.data
  }

  async function verify(id: number) {
    const response = await post<AdPlatformAccount>(`/api/ad-platform-accounts/${id}/verify`, {})
    return response.data
  }

  async function archive(id: number) {
    const response = await post<AdPlatformAccount>(`/api/ad-platform-accounts/${id}/archive`, {})
    return response.data
  }

  async function startGoogleOauth() {
    const response = await post<{ url: string }>('/api/ad-platform-accounts/google/oauth/start', {})
    return response.data.url
  }

  async function googleCustomers(selection: string) {
    const response = await get<{ customers: Array<GoogleCustomer> }>(
      '/api/ad-platform-accounts/google/oauth/selection',
      { selection }
    )
    return response.data.customers
  }

  async function completeGoogleOauth(body: {
    selection: string
    name: string
    external_account_id: string
    login_customer_id: string | null
  }) {
    const response = await post<AdPlatformAccount>('/api/ad-platform-accounts/google/oauth/complete', {
      selection: body.selection,
      name: body.name,
      external_account_id: body.external_account_id,
      login_customer_id: body.login_customer_id
    })
    return response.data
  }

  async function probeTag(gclid: string) {
    const response = await get<TagProbe>('/api/advertising/tag-probe', { gclid })
    return response.data
  }

  return {
    connectMeta,
    updateAccount,
    verify,
    archive,
    startGoogleOauth,
    googleCustomers,
    completeGoogleOauth,
    probeTag
  }
}
