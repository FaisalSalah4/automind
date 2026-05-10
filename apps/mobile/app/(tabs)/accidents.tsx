import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import type { AccidentLog } from '@automind/shared'
import { useTheme } from '@/lib/theme'

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_repair: 'In Repair',
  settled: 'Settled',
  closed: 'Closed',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
  in_repair: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  settled: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  closed: { bg: 'rgba(107,114,128,0.15)', text: '#6B7280' },
}

const STATUS_OPTIONS = ['open', 'in_repair', 'settled', 'closed'] as const

export default function AccidentsScreen() {
  const { colors } = useTheme()
  const [carId, setCarId] = useState<string | null>(null)
  const [accidents, setAccidents] = useState<AccidentLog[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<'open' | 'in_repair' | 'settled' | 'closed'>('open')
  const [description, setDescription] = useState('')

  async function load() {
    const { data: cars } = await supabase
      .from('cars')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)

    const firstCarId = cars?.[0]?.id ?? null
    setCarId(firstCarId)

    if (firstCarId) {
      const { data } = await supabase
        .from('accident_logs')
        .select('*')
        .eq('car_id', firstCarId)
        .order('date', { ascending: false })
      setAccidents((data as AccidentLog[]) ?? [])
    }
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function resetForm() {
    setTitle('')
    setDate(new Date().toISOString().split('T')[0])
    setLocation('')
    setStatus('open')
    setDescription('')
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required.')
      return
    }
    if (!carId) {
      Alert.alert('No car', 'Add a car first before logging an accident.')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Error', 'Not authenticated.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('accident_logs').insert({
      car_id: carId,
      user_id: user.id,
      date,
      title: title.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      status,
      at_fault: false,
      third_party_involved: false,
      damaged_parts: [],
      photo_urls: [],
    })

    setSubmitting(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setShowForm(false)
      resetForm()
      await load()
    }
  }

  const inputStyle = {
    backgroundColor: colors.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
        }
      >
        <View style={{ padding: 16, gap: 12 }}>
          {accidents.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 32,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                No accidents logged yet.{'\n'}Tap + to record an incident.
              </Text>
            </View>
          ) : (
            accidents.map((accident) => {
              const sc = STATUS_COLORS[accident.status] ?? STATUS_COLORS.closed
              return (
                <View
                  key={accident.id}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{accident.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{accident.date}</Text>
                      {accident.location ? (
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{accident.location}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View
                        style={{
                          borderRadius: 100,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor: sc.bg,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: sc.text }}>
                          {STATUS_LABELS[accident.status] ?? accident.status}
                        </Text>
                      </View>
                      {accident.out_of_pocket != null && (
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>
                          Out of pocket: {Number(accident.out_of_pocket).toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => setShowForm(true)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: colors.activeTab,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.activeTab,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: colors.buttonText, fontSize: 28, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.bg }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Log Accident</Text>
            <Pressable onPress={() => { setShowForm(false); resetForm() }}>
              <Text style={{ color: colors.activeTab, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Title *</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Rear-end collision on highway"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Date</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Location</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={location}
              onChangeText={setLocation}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={{
                    borderRadius: 100,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    backgroundColor: status === s ? `${colors.activeTab}33` : 'transparent',
                    borderColor: status === s ? colors.activeTab : colors.inputBorder,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: status === s ? colors.activeTab : colors.textMuted,
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Description</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 20, height: 80, textAlignVertical: 'top' }}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what happened..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? colors.textMuted : colors.activeTab,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
                {submitting ? 'Saving…' : 'Log Accident'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
