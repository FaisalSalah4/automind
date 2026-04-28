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
}

export function ReminderForm({ cars, defaultCarId }: { cars: CarOption[]; defaultCarId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    car_id: defaultCarId,
    type: 'date',
    title: '',
    due_date: '',
    due_mileage: '',
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

    const { error: dbError } = await supabase.from('reminders').insert({
      car_id: fields.car_id,
      user_id: user.id,
      type: fields.type,
      title: fields.title,
      due_date: fields.type === 'date' ? fields.due_date || null : null,
      due_mileage: fields.type === 'mileage' ? parseInt(fields.due_mileage) || null : null,
    })

    if (dbError) {
      setError(dbError.message)
    } else {
      setFields((prev) => ({ ...prev, title: '', due_date: '', due_mileage: '' }))
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reminder-title">Reminder</Label>
        <Input
          id="reminder-title"
          placeholder="e.g. Registration renewal"
          value={fields.title}
          onChange={(e) => update('title', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={fields.type} onValueChange={(v) => update('type', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">By Date</SelectItem>
            <SelectItem value="mileage">By Mileage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fields.type === 'date' ? (
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={fields.due_date}
            onChange={(e) => update('due_date', e.target.value)}
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="due_mileage">Due at (km)</Label>
          <Input
            id="due_mileage"
            type="number"
            min={0}
            placeholder="e.g. 85000"
            value={fields.due_mileage}
            onChange={(e) => update('due_mileage', e.target.value)}
            required
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : 'Add Reminder'}
      </Button>
    </form>
  )
}
