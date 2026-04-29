interface FuelLogWithConsumption {
  id: string
  date: string
  liters: number
  cost_per_liter: number
  total_cost: number
  mileage: number
  full_tank: boolean
  notes?: string | null
  consumption: number | null
}

export function FuelLogList({
  logs,
  currencySymbol,
}: {
  logs: FuelLogWithConsumption[]
  currencySymbol: string
}) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No fill-ups logged yet</p>
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start justify-between p-3 rounded-lg border">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{log.date}</p>
            <p className="text-xs text-muted-foreground">
              {Number(log.liters).toFixed(2)} L @ {currencySymbol}{Number(log.cost_per_liter).toFixed(3)}/L
            </p>
            <p className="text-xs text-muted-foreground">
              {log.mileage.toLocaleString()} km
              {!log.full_tank && ' · partial fill'}
            </p>
            {log.consumption !== null && (
              <p className="text-xs font-medium text-primary">
                {log.consumption.toFixed(1)} L/100km
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{currencySymbol}{Number(log.total_cost).toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
