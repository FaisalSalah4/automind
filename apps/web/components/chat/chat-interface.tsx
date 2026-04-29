'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STARTER_QUESTIONS = [
  'Am I due for an oil change?',
  'How much have I spent on my car this year?',
  'What maintenance should I expect soon?',
  "What's my average fuel consumption this month?",
]

interface CarOption {
  id: string
  name: string
  make: string
  model: string
  year: number
}

export function ChatInterface({ cars }: { cars: CarOption[] }) {
  const [selectedCarId, setSelectedCarId] = useState(cars[0]?.id ?? '')

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    body: { carId: selectedCarId },
    streamProtocol: 'text',
  })

  function sendStarter(question: string) {
    setInput(question)
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement
      form?.requestSubmit()
    }, 50)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden rounded-lg border bg-background">
      {/* Car selector */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">Car:</span>
        <Select value={selectedCarId} onValueChange={setSelectedCarId}>
          <SelectTrigger className="w-48">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
            <div className="space-y-2">
              <Bot className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">AutoMind AI Assistant</h3>
              <p className="text-muted-foreground text-sm">
                Ask me anything about your car&apos;s history, costs, and maintenance
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendStarter(q)}
                  className="rounded-lg border p-3 text-sm text-left hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex gap-3 max-w-[85%]',
                m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {m.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          id="chat-form"
          onSubmit={handleSubmit}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your car…"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
