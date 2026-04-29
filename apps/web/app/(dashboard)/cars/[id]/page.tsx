import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'
import { predictUpcomingServices } from '@automind/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, Fuel, Car } from 'lucide-react'
import Link from 'next/link'

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const [{ data: car }, { data: maintenance }, { data: fuel }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', id).single(),
    supabase
      .from('maintenance_logs')
      .select('*')
      .eq('car_id', id)
      .order('service_date', { ascending: false })
      .limit(5),
    supabase
      .from('fuel_logs')
      .select('*')
      .eq('car_id', id)
      .order('date', { ascending: false })
      .limit(5),
  ])

  if (!car) notFound()

  const predictions = predictUpcomingServices(maintenance ?? [], car.current_mileage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{car.name}</h1>
          <p className="text-muted-foreground">
            {car.year} {car.make} {car.model}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/cars/${id}/edit`}>Edit Car</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Mileage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{car.current_mileage.toLocaleString()} km</div>
          </CardContent>
        </Card>
        {car.license_plate && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                License Plate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-base px-3 py-1">
                {car.license_plate}
              </Badge>
            </CardContent>
          </Card>
        )}
        {car.purchase_date && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchased</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{car.purchase_date}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Service Predictions</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.slice(0, 4).map((p) => (
              <div key={p.type} className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {p.kmRemaining <= 0
                      ? `${Math.abs(p.kmRemaining).toLocaleString()} km overdue`
                      : `${p.kmRemaining.toLocaleString()} km`}
                  </span>
                  {p.urgency !== 'ok' && (
                    <Badge
                      variant={p.urgency === 'overdue' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {p.urgency === 'overdue' ? 'Overdue' : 'Soon'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Maintenance</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/maintenance">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {maintenance && maintenance.length > 0 ? (
              maintenance.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.service_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{m.mileage_at_service.toLocaleString()} km</p>
                    {m.cost && (
                      <p className="text-xs text-muted-foreground">{currencySymbol}{Number(m.cost).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No maintenance logged yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
