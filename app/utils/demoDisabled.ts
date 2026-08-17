import { FetchError } from 'ofetch'

export const DEMO_DISABLED_KEY = 'errors.agent.demo_disabled'

export function bodyContainsDemoDisabled(body: unknown): boolean {
  if (typeof body === 'string') {
    return body === DEMO_DISABLED_KEY
  }

  if (Array.isArray(body)) {
    return body.some(item => bodyContainsDemoDisabled(item))
  }

  if (body !== null && typeof body === 'object') {
    return Object.values(body).some(value => bodyContainsDemoDisabled(value))
  }

  return false
}

export function isDemoDisabledError(error: unknown): boolean {
  if (!(error instanceof FetchError)) {
    return false
  }

  return bodyContainsDemoDisabled(error.data)
}
