export function formatAgentCost(amount: string, currency: string): string {
  const numeric = Number.parseFloat(amount)
  const formatted = Number.isNaN(numeric)
    ? amount
    : numeric.toFixed(6).replace(/\.?0+$/, '')

  const symbol = currencySymbol(currency)

  return `≈ ${symbol}${formatted}`
}

function currencySymbol(currency: string): string {
  switch (currency) {
    case 'EUR':
      return '€'
    case 'USD':
      return '$'
    case 'GBP':
      return '£'
    default:
      return `${currency} `
  }
}
