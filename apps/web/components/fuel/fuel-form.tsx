'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CarOption {
  id: string
  name: string
  make: string
  model: string
  year: number
  current_mileage: number
}

export function FuelForm({
  cars,
  defaultCarId,
  currencySymbol,
}: {
  cars: CarOption[]
  defaultCarId: string
  currencySymbol: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    car_id: defaultCarId,
    date: new Date().toISOString().split('T')[0],
    liters: '',
    cost_per_liter: '',
    mileage: cars.find((c) => c.id === defaultCarId)?.current_mileage?.toString() ?? '',
    full_tank: 'true',
    notes: '',
  })

  const totalCost =
    fields.liters && fields.cost_per_liter
      ? (parseFloat(fields.liters) * parseFloat(fields.cost_per_liter)).toFixed(2)
      : ''

  function update(field: string, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('fuel_logs').insert({
      car_id: fields.car_id,
      user_id: user.id,
      date: fields.date,
      liters: parseFloat(fields.liters),
      cost_per_liter: parseFloat(fields.cost_per_liter),
      total_cost: parseFloat(totalCost),
      mileage: parseInt(fields.mileage),
      full_tank: fields.full_tank === 'true',
      notes: fields.notes || null,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
    } else {
      setFields((prev) => ({ ...prev, liters: '', cost_per_liter: '', notes: '' }))
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fuel-date">Date</Label>
          <Input
            id="fuel-date"
            type="date"
            value={fields.date}
            onChange={(e) => update('date', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuel-mileage">Odometer (km)</Label>
          <Input
            id="fuel-mileage"
            type="number"
            min={0}
            value={fields.mileage}
            onChange={(e) => update('mileage', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="liters">Liters</Label>
          <Input
            id="liters"
            type="number"
            step="0.01"
            min={0}
            value={fields.liters}
            onChange={(e) => update('liters', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost_per_liter">Price / Liter ({currencySymbol})</Label>
          <Input
            id="cost_per_liter"
            type="number"
            step="0.001"
            min={0}
            value={fields.cost_per_liter}
            onChange={(e) => update('cost_per_liter', e.target.value)}
            required
          />
        </div>
      </div>

      {totalCost && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm">
          Total: <span className="font-semibold">{currencySymbol}{totalCost}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Full Tank?</Label>
        <Select value={fields.full_tank} onValueChange={(v) => update('full_tank', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes (full tank)</SelectItem>
            <SelectItem value="false">No (partial fill)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : 'Log Fill-up'}
      </Button>
    </form>
  )
}
