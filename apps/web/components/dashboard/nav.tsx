'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Car, Wrench, Fuel, BarChart3, MessageSquare, Bell, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Car as CarType } from '@automind/shared'
import { CurrencySelector } from '@/components/currency/currency-selector'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/cars', label: 'My Cars', icon: Car },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/fuel', label: 'Fuel', icon: Fuel },
  { href: '/expenses', label: 'Expenses', icon: BarChart3 },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
]

interface DashboardNavProps {
  cars: CarType[]
  userEmail: string
  currency: string
}

export function DashboardNav({ cars, userEmail, currency }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary">CarMind</h1>
        <p className="text-xs text-muted-foreground mt-1 truncate">{userEmail}</p>
      </div>

      {cars.length > 0 && (
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Cars
          </p>
          <div className="space-y-1">
            {cars.slice(0, 3).map((car) => (
              <Link
                key={car.id}
                href={`/cars/${car.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">
                  {car.year} {car.make} {car.model}
                </span>
              </Link>
            ))}
            {cars.length > 3 && (
              <Link
                href="/cars"
                className="text-xs text-muted-foreground hover:text-foreground px-2"
              >
                +{cars.length - 3} more
              </Link>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Appearance
          </p>
          <ThemeToggle />
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Currency
        </p>
        <CurrencySelector current={currency} />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-background">{sidebarContent}</aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between border-b bg-background px-4">
        <h1 className="text-lg font-bold text-primary">CarMind</h1>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 pt-[56px]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 h-full bg-background border-r">{sidebarContent}</aside>
        </div>
      )}
    </>
  )
}
