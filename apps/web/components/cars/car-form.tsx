'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { Car } from '@automind/shared'

interface CarFormProps {
  car?: Car
}

export function CarForm({ car }: CarFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    name: car?.name ?? '',
    make: car?.make ?? '',
    model: car?.model ?? '',
    year: car?.year?.toString() ?? '',
    license_plate: car?.license_plate ?? '',
    current_mileage: car?.current_mileage?.toString() ?? '',
    purchase_date: car?.purchase_date ?? '',
  })

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

    const payload = {
      name: fields.name,
      make: fields.make,
      model: fields.model,
      year: parseInt(fields.year),
      license_plate: fields.license_plate || null,
      current_mileage: parseInt(fields.current_mileage),
      purchase_date: fields.purchase_date || null,
      user_id: user.id,
    }

    const { error: dbError } = car
      ? await supabase.from('cars').update(payload).eq('id', car.id)
      : await supabase.from('cars').insert(payload)

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
    } else {
      router.push('/cars')
      router.refresh()
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Car Nickname</Label>
            <Input
              id="name"
              placeholder="e.g. My Honda"
              value={fields.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                placeholder="e.g. Honda"
                value={fields.make}
                onChange={(e) => update('make', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g. Civic"
                value={fields.model}
                onChange={(e) => update('model', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g. 2020"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={fields.year}
                onChange={(e) => update('year', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_plate">License Plate</Label>
              <Input
                id="license_plate"
                placeholder="Optional"
                value={fields.license_plate}
                onChange={(e) => update('license_plate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_mileage">Current Mileage (km)</Label>
              <Input
                id="current_mileage"
                type="number"
                placeholder="e.g. 45000"
                min={0}
                value={fields.current_mileage}
                onChange={(e) => update('current_mileage', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={fields.purchase_date}
                onChange={(e) => update('purchase_date', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : car ? 'Save Changes' : 'Add Car'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
