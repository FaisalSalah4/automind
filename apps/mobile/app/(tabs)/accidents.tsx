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

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_repair: 'In Repair',
  settled: 'Settled',
  closed: 'Closed',
}

const STATUS_BG: Record<string, string> = {
  open: 'bg-red-100',
  in_repair: 'bg-amber-100',
  settled: 'bg-blue-100',
  closed: 'bg-gray-100',
}

const STATUS_TEXT: Record<string, string> = {
  open: 'text-red-700',
  in_repair: 'text-amber-700',
  settled: 'text-blue-700',
  closed: 'text-gray-600',
}

const STATUS_OPTIONS = ['open', 'in_repair', 'settled', 'closed'] as const

export default function AccidentsScreen() {
  const [carId, setCarId] = useState<string | null>(null)
  const [accidents, setAccidents] = useState<AccidentLog[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
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

  useEffect(() => {
    load()
  }, [])

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

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4 space-y-3">
          {accidents.length === 0 ? (
            <View className="bg-white rounded-2xl border border-gray-200 p-8 items-center">
              <Text className="text-gray-400 text-center text-sm">
                No accidents logged yet.{'\n'}Tap + to record an incident.
              </Text>
            </View>
          ) : (
            accidents.map((accident) => (
              <View
                key={accident.id}
                className="bg-white rounded-2xl border border-gray-200 p-4"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-3">
                    <Text className="font-semibold text-gray-900 text-base">{accident.title}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{accident.date}</Text>
                    {accident.location ? (
                      <Text className="text-xs text-gray-500 mt-0.5">{accident.location}</Text>
                    ) : null}
                  </View>
                  <View className="items-end gap-1">
                    <View
                      className={`rounded-full px-2 py-0.5 ${STATUS_BG[accident.status] ?? 'bg-gray-100'}`}
                    >
                      <Text
                        className={`text-xs font-medium ${STATUS_TEXT[accident.status] ?? 'text-gray-600'}`}
                      >
                        {STATUS_LABELS[accident.status] ?? accident.status}
                      </Text>
                    </View>
                    {accident.out_of_pocket != null && (
                      <Text className="text-xs text-gray-500">
                        Out of pocket: {Number(accident.out_of_pocket).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowForm(true)}
        className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.85}
      >
        <Text className="text-white text-3xl font-light leading-none">+</Text>
      </TouchableOpacity>

      {/* Add Accident Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-white"
        >
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">Log Accident</Text>
            <Pressable onPress={() => { setShowForm(false); resetForm() }}>
              <Text className="text-blue-500 text-base">Cancel</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            <View className="space-y-4">
              {/* Title */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Title *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Rear-end collision on highway"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Date */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Date</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Location */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Location</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Optional"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Status */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(s)}
                      className={`rounded-full px-3 py-1.5 border ${
                        status === s
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          status === s ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe what happened..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                className={`rounded-xl py-3 items-center mt-2 ${
                  submitting ? 'bg-blue-300' : 'bg-blue-500'
                }`}
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-base">
                  {submitting ? 'Saving…' : 'Log Accident'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
