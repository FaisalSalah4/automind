export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const CURRENCY_COOKIE = 'automind_currency'
export const DEFAULT_CURRENCY = 'USD'

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}
