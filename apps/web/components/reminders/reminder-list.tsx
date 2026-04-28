'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Reminder } from '@automind/shared'

interface ReminderListProps {
  reminders: Reminder[]
  currentMileage: number
  today: string
}

export function ReminderList({ reminders, currentMileage, today }: ReminderListProps) {
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)

  function isOverdue(r: Reminder) {
    if (r.is_done) return false
    if (r.type === 'date') return !!r.due_date && r.due_date < today
    if (r.type === 'mileage') return !!r.due_mileage && r.due_mileage <= currentMileage
    return false
  }

  async function markDone(id: string) {
    setCompleting(id)
    const supabase = createClient()
    await supabase.from('reminders').update({ is_done: true }).eq('id', id)
    router.refresh()
    setCompleting(null)
  }

  const active = reminders.filter((r) => !r.is_done)
  const done = reminders.filter((r) => r.is_done)

  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No reminders yet</p>
  }

  return (
    <div className="space-y-3">
      {active.map((r) => {
        const overdue = isOverdue(r)
        return (
          <div
            key={r.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border',
              overdue && 'border-destructive/50 bg-destructive/5'
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.title}</span>
                {overdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {r.type === 'date'
                  ? `Due: ${r.due_date}`
                  : `Due at: ${r.due_mileage?.toLocaleString()} km`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markDone(r.id)}
              disabled={completing === r.id}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
          </div>
        )
      })}

      {done.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Completed
          </p>
          {done.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border opacity-50"
            >
              <span className="text-sm line-through">{r.title}</span>
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
