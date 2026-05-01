import { createClient } from '@/lib/supabase/server'
import { predictUpcomingServices } from '@automind/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Car, Wrench, Fuel, Bell, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: cars }, { data: reminders }] = await Promise.all([
    supabase.from('cars').select('*').order('created_at', { ascending: false }),
    supabase
      .from('reminders')
      .select('*')
      .eq('is_done', false)
      .order('created_at', { ascending: false }),
  ])

  const firstCarId = cars?.[0]?.id ?? null
  const { data: activeAccidents } = firstCarId
    ? await supabase
        .from('accident_logs')
        .select('id, status, out_of_pocket')
        .eq('car_id', firstCarId)
        .in('status', ['open', 'in_repair'])
    : { data: [] }

  const firstCar = cars?.[0]
  const activeAccidentCount = activeAccidents?.length ?? 0
  const totalOutOfPocket = (activeAccidents ?? []).reduce(
    (sum, a) => sum + (Number(a.out_of_pocket) || 0),
    0
  )
  let predictions: ReturnType<typeof predictUpcomingServices> = []

  if (firstCar) {
    const { data: maintenance } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('car_id', firstCar.id)
      .order('mileage_at_service', { ascending: false })
      .limit(20)

    predictions = predictUpcomingServices(maintenance ?? [], firstCar.current_mileage)
  }

  const today = new Date().toISOString().split('T')[0]
  const overdueReminders =
    reminders?.filter(
      (r) =>
        (r.type === 'date' && r.due_date && r.due_date < today) ||
        (r.type === 'mileage' &&
          firstCar &&
          r.due_mileage &&
          r.due_mileage <= firstCar.current_mileage)
    ) ?? []

  const urgentPredictions = predictions.filter((p) => p.urgency !== 'ok')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to CarMind</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cars</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cars?.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Mileage</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {firstCar ? `${firstCar.current_mileage.toLocaleString()} km` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">{firstCar?.name ?? 'No car added yet'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Due Soon</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentPredictions.length}</div>
            <p className="text-xs text-muted-foreground">overdue or within 500 km</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueReminders.length}</div>
          </CardContent>
        </Card>

        <Link href="/accidents" className="block">
          <Card className={activeAccidentCount > 0 ? 'border-red-300 dark:border-red-800' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
              <AlertTriangle
                className={`h-4 w-4 ${
                  activeAccidentCount > 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  activeAccidentCount > 0 ? 'text-red-600 dark:text-red-400' : ''
                }`}
              >
                {activeAccidentCount}
              </div>
              {totalOutOfPocket > 0 && (
                <p className="text-xs text-muted-foreground">
                  {totalOutOfPocket.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} out of pocket
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {urgentPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentPredictions.map((p) => (
              <div key={p.type} className="flex items-center justify-between">
                <span className="font-medium">{p.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {p.kmRemaining <= 0
                      ? `${Math.abs(p.kmRemaining).toLocaleString()} km overdue`
                      : `${p.kmRemaining.toLocaleString()} km remaining`}
                  </span>
                  <Badge variant={p.urgency === 'overdue' ? 'destructive' : 'secondary'}>
                    {p.urgency === 'overdue' ? 'Overdue' : 'Due Soon'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {overdueReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Reminders
              <Badge variant="destructive">{overdueReminders.length} overdue</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueReminders.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="font-medium">{r.title}</span>
                <span className="text-sm text-destructive">
                  {r.type === 'date' ? r.due_date : `${r.due_mileage?.toLocaleString()} km`}
                </span>
              </div>
            ))}
            <Link href="/reminders" className="text-sm text-primary hover:underline">
              View all reminders →
            </Link>
          </CardContent>
        </Card>
      )}

      {!firstCar && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cars yet</h3>
            <p className="text-muted-foreground mb-4">Add your first car to get started</p>
            <Link
              href="/cars/new"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add a Car
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
