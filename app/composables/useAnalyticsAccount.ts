import type { AnalyticsAccountWritePayload } from '~/types/insights'

/**
 * Single-account helpers keyed by id. List state lives in useAnalyticsAccounts().
 */
export function useAnalyticsAccount(id: MaybeRefOrGetter<number | null>) {
  const { accounts, update, verify, setDefault, archive, submitting, actionError, refresh }
    = useAnalyticsAccounts()

  const account = computed(() => {
    const accountId = toValue(id)
    if (accountId == null) {
      return null
    }
    return accounts.value.find(row => row.id === accountId) ?? null
  })

  async function save(payload: Omit<AnalyticsAccountWritePayload, 'provider'>) {
    const accountId = toValue(id)
    if (accountId == null) {
      return null
    }
    return update(accountId, payload)
  }

  async function verifyAccount() {
    const accountId = toValue(id)
    if (accountId == null) {
      return null
    }
    return verify(accountId)
  }

  async function makeDefault() {
    const accountId = toValue(id)
    if (accountId == null) {
      return false
    }
    return setDefault(accountId)
  }

  async function archiveAccount() {
    const accountId = toValue(id)
    if (accountId == null) {
      return false
    }
    return archive(accountId)
  }

  return {
    account,
    submitting,
    actionError,
    refresh,
    save,
    verifyAccount,
    makeDefault,
    archiveAccount
  }
}
