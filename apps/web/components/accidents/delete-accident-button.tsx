'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteAccidentButtonProps {
  accidentId: string
}

export function DeleteAccidentButton({ accidentId }: DeleteAccidentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    const supabase = createClient()
    await supabase.from('accident_logs').delete().eq('id', accidentId)
    router.push('/accidents')
    router.refresh()
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {loading ? 'Deleting…' : confirming ? 'Confirm Delete' : 'Delete'}
    </Button>
  )
}
