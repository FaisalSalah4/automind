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

interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterScreen() {
  const { colors } = useTheme()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!fullName.trim()) next.fullName = 'Full name is required.'
    if (!email.trim()) next.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 6) next.password = 'Password must be at least 6 characters.'
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setSupabaseError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    })

    setLoading(false)

    if (error) {
      setSupabaseError(error.message)
      return
    }

    if (data.session) {
      // Session created immediately — AuthGuard in root layout will redirect to tabs
      return
    }

    // No session = email confirmation required
    setAwaitingConfirmation(true)
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
  }

  const labelStyle = {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textMuted,
    marginBottom: 6,
  }

  const errorStyle = {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
    marginBottom: 12,
  }

  const noErrorSpacing = { marginBottom: 16 }

  if (awaitingConfirmation) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>📧</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          We sent a confirmation link to{'\n'}
          <Text style={{ color: colors.activeTab, fontWeight: '600' }}>{email}</Text>
          {'\n\n'}Click it to activate your account.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={{ color: colors.activeTab, fontSize: 15, fontWeight: '700' }}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 38, fontWeight: '800', color: colors.activeTab, marginBottom: 6, letterSpacing: -1 }}>
          CarMind
        </Text>
        <Text style={{ fontSize: 16, color: colors.textMuted, marginBottom: 32 }}>
          Create your account
        </Text>

        {supabaseError && (
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
            <Text style={{ color: '#EF4444', fontSize: 14 }}>{supabaseError}</Text>
          </View>
        )}

        {/* Full Name */}
        <Text style={labelStyle}>Full Name</Text>
        <TextInput
          style={{ ...inputStyle, ...(errors.fullName ? {} : noErrorSpacing) }}
          placeholder="Jane Smith"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoComplete="name"
          value={fullName}
          onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: undefined })) }}
        />
        {errors.fullName && <Text style={errorStyle}>{errors.fullName}</Text>}

        {/* Email */}
        <Text style={labelStyle}>Email</Text>
        <TextInput
          style={{ ...inputStyle, ...(errors.email ? {} : noErrorSpacing) }}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })) }}
        />
        {errors.email && <Text style={errorStyle}>{errors.email}</Text>}

        {/* Password */}
        <Text style={labelStyle}>Password</Text>
        <TextInput
          style={{ ...inputStyle, ...(errors.password ? {} : noErrorSpacing) }}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })) }}
        />
        {errors.password && <Text style={errorStyle}>{errors.password}</Text>}

        {/* Confirm Password */}
        <Text style={labelStyle}>Confirm Password</Text>
        <TextInput
          style={{ ...inputStyle, ...(errors.confirmPassword ? {} : { marginBottom: 24 }) }}
          placeholder="Repeat your password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: undefined })) }}
          onSubmitEditing={handleRegister}
        />
        {errors.confirmPassword && (
          <Text style={{ ...errorStyle, marginBottom: 24 }}>{errors.confirmPassword}</Text>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: loading ? colors.textMuted : colors.activeTab,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28, gap: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={{ color: colors.activeTab, fontSize: 14, fontWeight: '700' }}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
