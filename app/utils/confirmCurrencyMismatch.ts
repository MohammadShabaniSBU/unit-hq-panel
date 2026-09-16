export function confirmCurrencyMismatch(currency: string | null | undefined): boolean {
  const deployment = useDeploymentStore()
  const { t } = useI18n()
  const next = currency?.trim().toUpperCase() ?? ''

  if (!next || next === deployment.currency) {
    return true
  }

  return window.confirm(t('forms.prices.currencyMismatchConfirm', {
    currency: next,
    countryCurrency: deployment.currency
  }))
}
