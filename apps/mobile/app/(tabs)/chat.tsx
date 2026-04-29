import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Car } from '@automind/shared'

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatScreen() {
  const [cars, setCars] = useState<Car[]>([])
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCars(data ?? [])
        if (data?.[0]) setSelectedCarId(data[0].id)
      })
  }, [])

  async function sendMessage() {
    if (!input.trim() || !selectedCarId || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${WEB_APP_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: updatedMessages, carId: selectedCarId }),
      })

      if (!res.ok) throw new Error('Network error')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      let assistantContent = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        if (text) {
          assistantContent += text
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
            return updated
          })
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
      scrollRef.current?.scrollToEnd({ animated: true })
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-3"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View className="items-center py-8 space-y-2">
            <Text className="text-2xl">🤖</Text>
            <Text className="font-semibold text-gray-900">CarMind AI</Text>
            <Text className="text-gray-500 text-sm text-center">
              Ask anything about your car&apos;s maintenance, costs, or fuel
            </Text>
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            className={`mb-3 max-w-[85%] px-4 py-3 rounded-2xl ${
              m.role === 'user'
                ? 'self-end bg-blue-600'
                : 'self-start bg-white border border-gray-200'
            }`}
          >
            <Text className={m.role === 'user' ? 'text-white' : 'text-gray-900'}>{m.content}</Text>
          </View>
        ))}

        {loading && (
          <View className="self-start bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-3">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </ScrollView>

      <View className="p-4 border-t border-gray-200 bg-white flex-row gap-3 items-end">
        <TextInput
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base"
          placeholder="Ask about your car…"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          className={`w-11 h-11 rounded-xl items-center justify-center ${
            input.trim() && !loading ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text className={input.trim() && !loading ? 'text-white' : 'text-gray-400'}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
