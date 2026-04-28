import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardNav cars={cars ?? []} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
