import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

const STORAGE_KEY = 'automind_currency'
const DEFAULT = 'USD'

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}

export function useCurrency() {
  const [code, setCode] = useState(DEFAULT)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setCode(val)
    })
  }, [])

  const setCurrency = useCallback(async (newCode: string) => {
    setCode(newCode)
    await AsyncStorage.setItem(STORAGE_KEY, newCode)
  }, [])

  return { symbol: getCurrencySymbol(code), code, setCurrency }
}
