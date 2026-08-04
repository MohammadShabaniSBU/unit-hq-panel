export const DEFAULT_AUTH_LANDING = '/leasing/contacts'

/**
 * Accept only same-origin relative paths beginning with a single `/`.
 * Rejects protocol-relative (`//…`) and absolute URLs (open redirect).
 */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') {
    return DEFAULT_AUTH_LANDING
  }

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return DEFAULT_AUTH_LANDING
  }

  return raw
}
