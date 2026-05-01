import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_repair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  settled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_repair: 'In Repair',
  settled: 'Settled',
  closed: 'Closed',
}

function formatPart(part: string) {
  return part
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function AccidentsPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year')
    .order('created_at', { ascending: false })

  const firstCar = cars?.[0] ?? null

  const { data: accidents } = firstCar
    ? await supabase
        .from('accident_logs')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('date', { ascending: false })
    : { data: [] }

  const totalRepairCost = (accidents ?? []).reduce(
    (sum, a) => sum + (Number(a.total_repair_cost) || 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accidents</h1>
          {firstCar && (
            <p className="text-muted-foreground">
              {firstCar.year} {firstCar.make} {firstCar.model}
            </p>
          )}
        </div>
        {firstCar && (
          <Button asChild>
            <Link href={`/accidents/new?carId=${firstCar.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Log Accident
            </Link>
          </Button>
        )}
      </div>

      {/* Stat card */}
      {accidents && accidents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repair Cost</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{totalRepairCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              across {accidents.length} incident{accidents.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accident list */}
      {accidents && accidents.length > 0 ? (
        <div className="space-y-3">
          {accidents.map((accident) => {
            const parts: string[] = accident.damaged_parts ?? []
            const shownParts = parts.slice(0, 3)
            const extraCount = parts.length - shownParts.length

            return (
              <Link key={accident.id} href={`/accidents/${accident.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{accident.title}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[accident.status] ?? STATUS_STYLES.closed
                            }`}
                          >
                            {STATUS_LABELS[accident.status] ?? accident.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {accident.date}
                          {accident.location ? ` · ${accident.location}` : ''}
                        </p>
                        {parts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {shownParts.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {formatPart(p)}
                              </Badge>
                            ))}
                            {extraCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{extraCount} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {accident.total_repair_cost != null && (
                          <p className="font-semibold">
                            {currencySymbol}{Number(accident.total_repair_cost).toFixed(2)}
                          </p>
                        )}
                        {accident.out_of_pocket != null && (
                          <p className="text-xs text-muted-foreground">
                            {currencySymbol}{Number(accident.out_of_pocket).toFixed(2)} out of pocket
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accidents logged</h3>
            <p className="text-muted-foreground mb-4">
              {firstCar
                ? 'No accidents recorded for this car. Hopefully it stays that way!'
                : 'Add a car first to start logging accidents.'}
            </p>
            {firstCar && (
              <Button asChild>
                <Link href={`/accidents/new?carId=${firstCar.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Accident
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
