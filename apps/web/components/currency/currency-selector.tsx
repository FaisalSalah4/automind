'use client'

import { useRouter } from 'next/navigation'
import { CURRENCIES, CURRENCY_COOKIE, DEFAULT_CURRENCY } from '@/lib/currency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function readCurrencyCookie(): string {
  if (typeof document === 'undefined') return DEFAULT_CURRENCY
  const match = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : DEFAULT_CURRENCY
}

export function CurrencySelector({ current }: { current: string }) {
  const router = useRouter()

  function handleChange(code: string) {
    document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <Select defaultValue={current} onValueChange={handleChange}>
      <SelectTrigger className="w-full text-xs h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code} className="text-xs">
            {c.symbol} — {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
