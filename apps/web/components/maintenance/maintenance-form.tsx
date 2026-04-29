'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { suggestNextServiceMileage } from '@automind/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

const SERVICE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
]

interface CarOption {
  id: string
  name: string
  make: string
  model: string
  year: number
  current_mileage: number
}

interface MaintenanceFormProps {
  cars: CarOption[]
  defaultCarId: string
  currencySymbol: string
}

export function MaintenanceForm({ cars, defaultCarId, currencySymbol }: MaintenanceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)

  const defaultCar = cars.find((c) => c.id === defaultCarId) ?? cars[0]
  const defaultMileage = defaultCar?.current_mileage ?? 0

  const [fields, setFields] = useState({
    car_id: defaultCar?.id ?? '',
    type: 'oil_change',
    title: 'Oil Change',
    description: '',
    mileage_at_service: defaultMileage.toString(),
    cost: '',
    service_date: new Date().toISOString().split('T')[0],
    // Pre-calculate on load so the field is never blank
    next_service_mileage: suggestNextServiceMileage('oil_change', defaultMileage).toString(),
  })

  function update(field: string, value: string) {
    setFields((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'type') {
        next.title = SERVICE_TYPES.find((t) => t.value === value)?.label ?? value
        const mileage = parseInt(prev.mileage_at_service) || defaultMileage
        next.next_service_mileage = suggestNextServiceMileage(value, mileage).toString()
      }

      if (field === 'mileage_at_service' && value) {
        next.next_service_mileage = suggestNextServiceMileage(
          prev.type,
          parseInt(value)
        ).toString()
      }

      if (field === 'car_id') {
        const car = cars.find((c) => c.id === value)
        if (car) {
          next.mileage_at_service = car.current_mileage.toString()
          next.next_service_mileage = suggestNextServiceMileage(
            prev.type,
            car.current_mileage
          ).toString()
        }
      }

      return next
    })
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

    // Store the storage path (not the signed URL) — signed URLs expire, paths don't
    let invoice_url: string | null = null

    if (invoiceFile) {
      setUploading(true)
      const ext = invoiceFile.name.split('.').pop()
      const path = `${user.id}/${fields.car_id}/${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(path, invoiceFile)

      setUploading(false)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }

      invoice_url = uploadData.path
    }

    const { error: dbError } = await supabase.from('maintenance_logs').insert({
      car_id: fields.car_id,
      user_id: user.id,
      type: fields.type,
      title: fields.title,
      description: fields.description || null,
      mileage_at_service: parseInt(fields.mileage_at_service),
      cost: fields.cost ? parseFloat(fields.cost) : null,
      service_date: fields.service_date,
      next_service_mileage: fields.next_service_mileage
        ? parseInt(fields.next_service_mileage)
        : null,
      invoice_url,
    })

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
    } else {
      router.push(`/maintenance?carId=${fields.car_id}`)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {cars.length > 1 && (
            <div className="space-y-2">
              <Label>Car</Label>
              <Select value={fields.car_id} onValueChange={(v) => update('car_id', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cars.map((car) => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.year} {car.make} {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={fields.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              value={fields.title}
              onChange={(e) => update('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage_at_service">Mileage (km)</Label>
              <Input
                id="mileage_at_service"
                type="number"
                min={0}
                value={fields.mileage_at_service}
                onChange={(e) => update('mileage_at_service', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-cost">Cost ({currencySymbol})</Label>
              <Input
                id="m-cost"
                type="number"
                step="0.01"
                min={0}
                placeholder="Optional"
                value={fields.cost}
                onChange={(e) => update('cost', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_date">Service Date</Label>
              <Input
                id="service_date"
                type="date"
                value={fields.service_date}
                onChange={(e) => update('service_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_service_mileage">Next Service (km)</Label>
              <Input
                id="next_service_mileage"
                type="number"
                min={0}
                value={fields.next_service_mileage}
                onChange={(e) => update('next_service_mileage', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-description">Notes</Label>
            <Textarea
              id="m-description"
              placeholder="Optional notes about this service"
              value={fields.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice">Invoice / Receipt</Label>
            <Input
              id="invoice"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP or PDF · max 50 MB
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? 'Uploading…' : loading ? 'Saving…' : 'Log Service'}
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
