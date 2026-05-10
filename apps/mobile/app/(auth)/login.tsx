import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'

export default function LoginScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  const inputStyle = {
    backgroundColor: colors.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 38, fontWeight: '800', color: colors.activeTab, marginBottom: 6, letterSpacing: -1 }}>
          CarMind
        </Text>
        <Text style={{ fontSize: 16, color: colors.textMuted, marginBottom: 36 }}>
          Sign in to your car tracker
        </Text>

        {error && (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.12)',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
          Email
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
          Password
        </Text>
        <TextInput
          style={{ ...inputStyle, marginBottom: 24 }}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={{
            backgroundColor: loading ? colors.textMuted : colors.activeTab,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
          }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28, gap: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register' as never)}>
            <Text style={{ color: colors.activeTab, fontSize: 14, fontWeight: '700' }}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
