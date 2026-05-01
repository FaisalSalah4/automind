import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY } from '@/lib/currency'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false })

  const cookieStore = await cookies()
  const currency = cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardNav cars={cars ?? []} userEmail={user.email ?? ''} currency={currency} />
      <main className="flex-1 overflow-y-auto p-4 pt-16 md:pt-6 md:p-6">{children}</main>
    </div>
  )
}
