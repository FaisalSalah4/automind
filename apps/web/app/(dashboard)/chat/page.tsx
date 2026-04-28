import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year')
    .order('created_at', { ascending: false })

  if (!cars || cars.length === 0) {
    redirect('/cars/new')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">Ask anything about your car&apos;s history</p>
      </div>
      <ChatInterface cars={cars} />
    </div>
  )
}
