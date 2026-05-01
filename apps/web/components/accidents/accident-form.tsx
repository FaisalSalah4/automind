'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

const DAMAGED_PARTS = [
  { value: 'front_bumper', label: 'Front Bumper' },
  { value: 'rear_bumper', label: 'Rear Bumper' },
  { value: 'hood', label: 'Hood' },
  { value: 'trunk', label: 'Trunk' },
  { value: 'roof', label: 'Roof' },
  { value: 'windshield', label: 'Windshield' },
  { value: 'rear_window', label: 'Rear Window' },
  { value: 'left_front_door', label: 'Left Front Door' },
  { value: 'right_front_door', label: 'Right Front Door' },
  { value: 'left_rear_door', label: 'Left Rear Door' },
  { value: 'right_rear_door', label: 'Right Rear Door' },
  { value: 'left_headlight', label: 'Left Headlight' },
  { value: 'right_headlight', label: 'Right Headlight' },
  { value: 'left_tail_light', label: 'Left Tail Light' },
  { value: 'right_tail_light', label: 'Right Tail Light' },
  { value: 'left_front_wheel', label: 'Left Front Wheel' },
  { value: 'right_front_wheel', label: 'Right Front Wheel' },
  { value: 'left_rear_wheel', label: 'Left Rear Wheel' },
  { value: 'right_rear_wheel', label: 'Right Rear Wheel' },
  { value: 'engine', label: 'Engine' },
  { value: 'airbags', label: 'Airbags' },
  { value: 'frame_chassis', label: 'Frame/Chassis' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_repair', label: 'In Repair' },
  { value: 'settled', label: 'Settled' },
  { value: 'closed', label: 'Closed' },
]

interface CarOption {
  id: string
  name: string
  make: string
  model: string
  year: number
  current_mileage: number
}

interface AccidentFormProps {
  cars: CarOption[]
  defaultCarId: string
  currencySymbol: string
}

export function AccidentForm({ cars, defaultCarId, currencySymbol }: AccidentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [selectedParts, setSelectedParts] = useState<string[]>([])

  const defaultCar = cars.find((c) => c.id === defaultCarId) ?? cars[0]

  const [fields, setFields] = useState({
    car_id: defaultCar?.id ?? '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    mileage_at_accident: '',
    at_fault: '' as '' | 'true' | 'false',
    third_party_involved: false,
    police_report_number: '',
    insurance_claim_number: '',
    description: '',
    total_repair_cost: '',
    insurance_covered: '',
    status: 'open',
  })

  function update(field: string, value: string | boolean) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    )
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setPhotoFiles(files.slice(0, 5))
  }

  const totalCost = parseFloat(fields.total_repair_cost) || 0
  const covered = parseFloat(fields.insurance_covered) || 0
  const outOfPocket = totalCost > 0 ? totalCost - covered : 0

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

    // Insert accident record first (without photos)
    const { data: accident, error: dbError } = await supabase
      .from('accident_logs')
      .insert({
        car_id: fields.car_id,
        user_id: user.id,
        date: fields.date,
        title: fields.title,
        description: fields.description || null,
        location: fields.location || null,
        mileage_at_accident: fields.mileage_at_accident
          ? parseInt(fields.mileage_at_accident)
          : null,
        at_fault: fields.at_fault === '' ? null : fields.at_fault === 'true',
        third_party_involved: fields.third_party_involved,
        police_report_number: fields.police_report_number || null,
        insurance_claim_number: fields.insurance_claim_number || null,
        total_repair_cost: fields.total_repair_cost ? parseFloat(fields.total_repair_cost) : null,
        insurance_covered: fields.insurance_covered ? parseFloat(fields.insurance_covered) : null,
        out_of_pocket: totalCost > 0 ? outOfPocket : null,
        status: fields.status,
        damaged_parts: selectedParts,
        photo_urls: [],
      })
      .select()
      .single()

    if (dbError || !accident) {
      setError(dbError?.message ?? 'Failed to save accident')
      setLoading(false)
      return
    }

    // Upload photos if any
    if (photoFiles.length > 0) {
      const uploadedPaths: string[] = []
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${fields.car_id}/${accident.id}/${i}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('accident-photos')
          .upload(path, file)
        if (uploadError) {
          setError(`Photo upload failed: ${uploadError.message}`)
          setLoading(false)
          return
        }
        uploadedPaths.push(uploadData.path)
      }

      await supabase
        .from('accident_logs')
        .update({ photo_urls: uploadedPaths })
        .eq('id', accident.id)
    }

    router.push('/accidents')
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Car selector */}
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="a-title">Title *</Label>
            <Input
              id="a-title"
              value={fields.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Rear-end collision on highway"
              required
            />
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="a-date">Date *</Label>
              <Input
                id="a-date"
                type="date"
                value={fields.date}
                onChange={(e) => update('date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-location">Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="a-location"
                value={fields.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="e.g. Main St & 5th Ave"
              />
            </div>
          </div>

          {/* Mileage */}
          <div className="space-y-2">
            <Label htmlFor="a-mileage">Mileage at Accident (km)</Label>
            <Input
              id="a-mileage"
              type="number"
              min={0}
              placeholder="Optional"
              value={fields.mileage_at_accident}
              onChange={(e) => update('mileage_at_accident', e.target.value)}
            />
          </div>

          {/* At fault + Third party */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>At Fault?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update('at_fault', fields.at_fault === 'true' ? '' : 'true')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    fields.at_fault === 'true'
                      ? 'bg-destructive text-destructive-foreground border-destructive'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => update('at_fault', fields.at_fault === 'false' ? '' : 'false')}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    fields.at_fault === 'false'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Third Party Involved?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update('third_party_involved', !fields.third_party_involved)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    fields.third_party_involved
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  {fields.third_party_involved ? 'Yes' : 'No'}
                </button>
              </div>
            </div>
          </div>

          {/* Police & Insurance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="a-police">Police Report #</Label>
              <Input
                id="a-police"
                value={fields.police_report_number}
                onChange={(e) => update('police_report_number', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-insurance">Insurance Claim #</Label>
              <Input
                id="a-insurance"
                value={fields.insurance_claim_number}
                onChange={(e) => update('insurance_claim_number', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="a-description">Description</Label>
            <Textarea
              id="a-description"
              placeholder="Describe what happened..."
              value={fields.description}
              onChange={(e) => update('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Damaged Parts */}
          <div className="space-y-2">
            <Label>Damaged Parts</Label>
            <div className="grid grid-cols-3 gap-2">
              {DAMAGED_PARTS.map((part) => (
                <label
                  key={part.value}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                    checked={selectedParts.includes(part.value)}
                    onChange={() => togglePart(part.value)}
                  />
                  <span>{part.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Costs */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="a-total-cost">Total Repair Cost ({currencySymbol})</Label>
                <Input
                  id="a-total-cost"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Optional"
                  value={fields.total_repair_cost}
                  onChange={(e) => update('total_repair_cost', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-insurance-covered">Insurance Covered ({currencySymbol})</Label>
                <Input
                  id="a-insurance-covered"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Optional"
                  value={fields.insurance_covered}
                  onChange={(e) => update('insurance_covered', e.target.value)}
                />
              </div>
            </div>
            {totalCost > 0 && (
              <p className="text-sm text-muted-foreground">
                Out of pocket:{' '}
                <span className="font-semibold text-foreground">
                  {currencySymbol}{outOfPocket.toFixed(2)}
                </span>
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={fields.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label htmlFor="a-photos">Photos (max 5)</Label>
            <Input
              id="a-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
            />
            {photoFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {photoFiles.length} file{photoFiles.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Log Accident'}
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
