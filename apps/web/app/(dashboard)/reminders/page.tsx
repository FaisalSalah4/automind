import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Plus } from 'lucide-react'
import { ReminderList } from '@/components/reminders/reminder-list'
import { ReminderForm } from '@/components/reminders/reminder-form'

export default async function RemindersPage() {
  const supabase = await createClient()

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year, current_mileage')
    .order('created_at', { ascending: false })

  const firstCar = cars?.[0]

  const { data: reminders } = firstCar
    ? await supabase
        .from('reminders')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const today = new Date().toISOString().split('T')[0]
  const overdueCount = (reminders ?? []).filter(
    (r) =>
      !r.is_done &&
      ((r.type === 'date' && r.due_date && r.due_date < today) ||
        (r.type === 'mileage' &&
          firstCar &&
          r.due_mileage &&
          r.due_mileage <= firstCar.current_mileage))
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Reminders</h1>
          {overdueCount > 0 && <Badge variant="destructive">{overdueCount} overdue</Badge>}
        </div>
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>

      {firstCar ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Reminder</CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderForm cars={cars ?? []} defaultCarId={firstCar.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderList
                reminders={reminders ?? []}
                currentMileage={firstCar.current_mileage}
                today={today}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add a car to create reminders
          </CardContent>
        </Card>
      )}
    </div>
  )
}
