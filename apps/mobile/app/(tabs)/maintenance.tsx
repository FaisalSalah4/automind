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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { predictUpcomingServices } from '@automind/shared'
import type { Car, MaintenanceLog, ServicePrediction } from '@automind/shared'
import { useCurrency } from '@/lib/currency'
import { useTheme } from '@/lib/theme'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const TYPE_OPTIONS = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'repair', label: 'Repair' },
  { value: 'other', label: 'Other' },
] as const

type ServiceType = (typeof TYPE_OPTIONS)[number]['value']

export default function MaintenanceScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [car, setCar] = useState<Car | null>(null)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [predictions, setPredictions] = useState<ServicePrediction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { symbol } = useCurrency()

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [type, setType] = useState<ServiceType>('oil_change')
  const [title, setTitle] = useState('Oil Change')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mileage, setMileage] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    const { data: cars } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    const firstCar = cars?.[0]
    setCar(firstCar ?? null)

    if (firstCar) {
      const { data: maintenance } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('service_date', { ascending: false })
        .limit(20)

      setLogs(maintenance ?? [])
      setPredictions(predictUpcomingServices(maintenance ?? [], firstCar.current_mileage))
    }
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function handleTypeChange(newType: ServiceType) {
    setType(newType)
    const label = TYPE_OPTIONS.find((t) => t.value === newType)?.label ?? ''
    setTitle(label)
  }

  function resetForm() {
    setType('oil_change')
    setTitle('Oil Change')
    setDate(new Date().toISOString().split('T')[0])
    setMileage('')
    setCost('')
    setDescription('')
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.')
      return
    }
    if (!mileage.trim() || isNaN(Number(mileage))) {
      Alert.alert('Required', 'Please enter a valid mileage.')
      return
    }
    if (!car) {
      Alert.alert('No car', 'Add a car first before logging maintenance.')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      Alert.alert('Error', 'Not authenticated.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('maintenance_logs').insert({
      car_id: car.id,
      user_id: user.id,
      type,
      title: title.trim(),
      service_date: date,
      mileage_at_service: parseInt(mileage),
      cost: cost.trim() ? parseFloat(cost) : null,
      description: description.trim() || null,
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
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
        }
      >
        <View style={{ padding: 16, gap: 12 }}>
          {predictions.filter((p) => p.urgency !== 'ok').length > 0 && (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15, marginBottom: 12 }}>
                Service Predictions
              </Text>
              {predictions
                .filter((p) => p.urgency !== 'ok')
                .map((p) => (
                  <View
                    key={p.type}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 14, color: colors.text }}>{p.label}</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: p.urgency === 'overdue' ? '#EF4444' : '#F59E0B',
                      }}
                    >
                      {p.urgency === 'overdue'
                        ? `${Math.abs(p.kmRemaining).toLocaleString()} km overdue`
                        : `${p.kmRemaining.toLocaleString()} km left`}
                    </Text>
                  </View>
                ))}
            </View>
          )}

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>Service History</Text>
            </View>
            {logs.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                  No maintenance logged yet.{'\n'}Tap + to record a service.
                </Text>
              </View>
            ) : (
              logs.map((log, i) => (
                <View
                  key={log.id}
                  style={{
                    padding: 16,
                    borderBottomWidth: i < logs.length - 1 ? 1 : 0,
                    borderBottomColor: colors.cardBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>{log.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {log.service_date} · {log.mileage_at_service.toLocaleString()} km
                      </Text>
                    </View>
                    {log.cost != null && (
                      <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>
                        {symbol}{Number(log.cost).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => setShowForm(true)}
        style={{
          position: 'absolute',
          bottom: TAB_BAR_HEIGHT + insets.bottom + 16,
          right: 16,
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
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Log Service</Text>
            <Pressable onPress={() => { setShowForm(false); resetForm() }}>
              <Text style={{ color: colors.activeTab, fontSize: 16 }}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
              Service Type
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {TYPE_OPTIONS.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => handleTypeChange(t.value)}
                  style={{
                    borderRadius: 100,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    backgroundColor: type === t.value ? `${colors.activeTab}33` : 'transparent',
                    borderColor: type === t.value ? colors.activeTab : colors.inputBorder,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: type === t.value ? colors.activeTab : colors.textMuted,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Title *</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Oil Change"
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

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Mileage *</Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={mileage}
              onChangeText={setMileage}
              placeholder="e.g. 85000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>
              Cost (optional)
            </Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 12 }}
              value={cost}
              onChangeText={setCost}
              placeholder="e.g. 75.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>
              Notes (optional)
            </Text>
            <TextInput
              style={{ ...inputStyle, marginBottom: 20, height: 80, textAlignVertical: 'top' }}
              value={description}
              onChangeText={setDescription}
              placeholder="Any additional notes..."
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
                {submitting ? 'Saving…' : 'Save Service'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
