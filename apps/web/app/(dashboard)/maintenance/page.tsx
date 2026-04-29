import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { predictUpcomingServices } from '@automind/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { CarSelector } from '@/components/maintenance/car-selector'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string }>
}) {
  const { carId } = await searchParams
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false })

  const selectedCar =
    (carId ? cars?.find((c) => c.id === carId) : null) ?? cars?.[0] ?? null

  const { data: logs } = selectedCar
    ? await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('car_id', selectedCar.id)
        .order('service_date', { ascending: false })
        .limit(20)
    : { data: [] }

  // Generate fresh signed URLs for any log that has a storage path
  const logsWithSignedUrls = await Promise.all(
    (logs ?? []).map(async (log) => {
      if (!log.invoice_url) return log
      const { data } = await supabase.storage
        .from('invoices')
        .createSignedUrl(log.invoice_url, 3600)
      return { ...log, invoice_signed_url: data?.signedUrl ?? null }
    })
  )

  const predictions = selectedCar
    ? predictUpcomingServices(logs ?? [], selectedCar.current_mileage)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance</h1>
          {selectedCar && (
            <p className="text-muted-foreground">
              {selectedCar.year} {selectedCar.make} {selectedCar.model}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {cars && cars.length > 1 && selectedCar && (
            <CarSelector
              cars={cars}
              selectedCarId={selectedCar.id}
              basePath="/maintenance"
            />
          )}
          {selectedCar && (
            <Button asChild>
              <Link href={`/maintenance/new?carId=${selectedCar.id}`}>
                <Plus className="h-4 w-4 mr-2" />
                Log Service
              </Link>
            </Button>
          )}
        </div>
      </div>

      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {predictions.map((p) => (
              <div
                key={p.type}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Due at {p.nextServiceMileage.toLocaleString()} km
                  </p>
                </div>
                <Badge
                  variant={
                    p.urgency === 'overdue'
                      ? 'destructive'
                      : p.urgency === 'soon'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {p.urgency === 'overdue'
                    ? `${Math.abs(p.kmRemaining).toLocaleString()} km overdue`
                    : p.urgency === 'soon'
                      ? `${p.kmRemaining.toLocaleString()} km`
                      : 'OK'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
        </CardHeader>
        <CardContent>
          {logsWithSignedUrls.length > 0 ? (
            <div className="space-y-3">
              {logsWithSignedUrls.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {log.description && (
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {log.service_date} · {log.mileage_at_service.toLocaleString()} km
                    </p>
                    {log.next_service_mileage && (
                      <p className="text-xs text-muted-foreground">
                        Next due: {log.next_service_mileage.toLocaleString()} km
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1 ml-4 shrink-0">
                    {log.cost && (
                      <p className="font-semibold">{currencySymbol}{Number(log.cost).toFixed(2)}</p>
                    )}
                    {log.invoice_signed_url && (
                      <a
                        href={log.invoice_signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        Invoice
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedCar ? 'No maintenance logged yet' : 'Add a car to log maintenance'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
