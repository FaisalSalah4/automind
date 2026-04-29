import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseCharts } from '@/components/expenses/expense-charts'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year, current_mileage, purchase_date')
    .order('created_at', { ascending: false })

  const firstCar = cars?.[0]

  const [{ data: maintenance }, { data: fuel }] = firstCar
    ? await Promise.all([
        supabase
          .from('maintenance_logs')
          .select('type, cost, service_date, mileage_at_service')
          .eq('car_id', firstCar.id)
          .not('cost', 'is', null)
          .order('service_date', { ascending: false }),
        supabase
          .from('fuel_logs')
          .select('total_cost, date, mileage')
          .eq('car_id', firstCar.id)
          .order('date', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]

  const totalMaintenanceCost = (maintenance ?? []).reduce((sum, m) => sum + Number(m.cost), 0)
  const totalFuelCost = (fuel ?? []).reduce((sum, f) => sum + Number(f.total_cost), 0)
  const totalCost = totalMaintenanceCost + totalFuelCost

  const firstFuelLog = (fuel ?? []).at(-1)
  const latestFuelLog = (fuel ?? []).at(0)
  const kmDriven =
    firstFuelLog && latestFuelLog
      ? latestFuelLog.mileage - firstFuelLog.mileage
      : null

  const costPerKm = kmDriven && kmDriven > 0 ? totalCost / kmDriven : null

  const byCategory: Record<string, number> = {}
  for (const m of maintenance ?? []) {
    const key = m.type.replace('_', ' ')
    byCategory[key] = (byCategory[key] ?? 0) + Number(m.cost)
  }
  if (totalFuelCost > 0) byCategory['fuel'] = totalFuelCost

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="text-muted-foreground">
          {firstCar ? `${firstCar.year} ${firstCar.make} ${firstCar.model}` : 'No car selected'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{totalMaintenanceCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{totalFuelCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost per km
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costPerKm !== null ? `${currencySymbol}${costPerKm.toFixed(3)}` : '—'}
            </div>
            {kmDriven && (
              <p className="text-xs text-muted-foreground">over {kmDriven.toLocaleString()} km</p>
            )}
          </CardContent>
        </Card>
      </div>

      {firstCar && (
        <ExpenseCharts
          maintenance={maintenance ?? []}
          fuel={fuel ?? []}
          byCategory={byCategory}
          currencySymbol={currencySymbol}
        />
      )}

      {!firstCar && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add a car and log expenses to see your spending breakdown
          </CardContent>
        </Card>
      )}
    </div>
  )
}
