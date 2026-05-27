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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Car } from '@automind/shared'
import { useTheme } from '@/lib/theme'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
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

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`${res.status}: ${body}`)
      }

      const reader = res.body?.getReader()

      if (!reader) {
        // React Native buffers the response — read it all at once
        const text = await res.text()
        setMessages((prev) => [...prev, { role: 'assistant', content: text }])
      } else {
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
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${msg}` },
      ])
    } finally {
      setLoading(false)
      scrollRef.current?.scrollToEnd({ animated: true })
    }
  }

  const canSend = input.trim().length > 0 && !loading

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🤖</Text>
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 17 }}>CarMind AI</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              Ask anything about your car&apos;s maintenance, costs, or fuel
            </Text>
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              marginBottom: 12,
              maxWidth: '85%',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 18,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor:
                m.role === 'user'
                  ? colors.activeTab
                  : colors.card,
              borderWidth: m.role === 'assistant' ? 1 : 0,
              borderColor: colors.cardBorder,
            }}
          >
            <Text
              style={{
                color: m.role === 'user' ? colors.buttonText : colors.text,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {m.content}
            </Text>
          </View>
        ))}

        {loading && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 12,
            }}
          >
            <ActivityIndicator size="small" color={colors.activeTab} />
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingTop: 12,
          paddingHorizontal: 12,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          backgroundColor: colors.card,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.input,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: colors.text,
            maxHeight: 120,
          }}
          placeholder="Ask about your car…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSend ? colors.activeTab : colors.cardBorder,
          }}
          onPress={sendMessage}
          disabled={!canSend}
        >
          <Text
            style={{
              color: canSend ? colors.buttonText : colors.textMuted,
              fontSize: 20,
              fontWeight: '700',
            }}
          >
            ↑
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
