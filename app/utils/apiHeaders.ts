export function apiHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const token = useAuthStore().token
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}
