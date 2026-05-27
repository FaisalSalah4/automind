import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { supabase } from '@/lib/supabase'
import { predictUpcomingServices } from '@automind/shared'
import type { Car, Reminder, ServicePrediction } from '@automind/shared'
import { useCurrency, CURRENCIES } from '@/lib/currency'
import { useTheme } from '@/lib/theme'

const RED = '#EF4444'
const AMBER = '#F59E0B'
const GREEN = '#10B981'

export default function DashboardScreen() {
  const { theme, colors } = useTheme()
  const { code, setCurrency } = useCurrency()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<DrawerNavigationProp<Record<string, undefined>>>()

  const [cars, setCars] = useState<Car[]>([])
  const [selectedCarIndex, setSelectedCarIndex] = useState(0)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [predictions, setPredictions] = useState<ServicePrediction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [showMileageEdit, setShowMileageEdit] = useState(false)
  const [mileageInput, setMileageInput] = useState('')
  const [savingMileage, setSavingMileage] = useState(false)
  const [mileageError, setMileageError] = useState<string | null>(null)
  const [mileageSaved, setMileageSaved] = useState(false)

  async function loadStats(car: Car) {
    const [{ data: maintenance }, { data: remindersData }] = await Promise.all([
      supabase
        .from('maintenance_logs')
        .select('*')
        .eq('car_id', car.id)
        .order('mileage_at_service', { ascending: false })
        .limit(20),
      supabase
        .from('reminders')
        .select('*')
        .eq('car_id', car.id)
        .eq('is_done', false)
        .order('created_at', { ascending: false }),
    ])
    setPredictions(predictUpcomingServices(maintenance ?? [], car.current_mileage))
    setReminders(remindersData ?? [])
  }

  async function load() {
    const { data: carsData } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })

    const allCars = carsData ?? []
    setCars(allCars)
    setSelectedCarIndex(0)

    const firstCar = allCars[0]
    if (firstCar) await loadStats(firstCar)
    else {
      setPredictions([])
      setReminders([])
    }
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function switchCar(newIndex: number) {
    const clamped = Math.max(0, Math.min(newIndex, cars.length - 1))
    setSelectedCarIndex(clamped)
    const car = cars[clamped]
    if (car) loadStats(car)
  }

  async function saveMileage() {
    const selectedCar = cars[selectedCarIndex]
    if (!selectedCar) return
    const km = parseInt(mileageInput, 10)
    if (isNaN(km)) {
      setMileageError('Please enter a valid number.')
      return
    }
    if (km < selectedCar.current_mileage) {
      setMileageError(`Can't go below ${selectedCar.current_mileage.toLocaleString()} km.`)
      return
    }
    setMileageError(null)
    setSavingMileage(true)
    await supabase.from('cars').update({ current_mileage: km }).eq('id', selectedCar.id)
    setSavingMileage(false)
    setShowMileageEdit(false)
    await load()
    setMileageSaved(true)
    setTimeout(() => setMileageSaved(false), 2000)
  }

  const selectedCar = cars[selectedCarIndex] ?? null
  const today = new Date().toISOString().split('T')[0]
  const overdueReminders = reminders.filter(
    (r) =>
      (r.type === 'date' && r.due_date && r.due_date < today) ||
      (r.type === 'mileage' &&
        selectedCar &&
        r.due_mileage &&
        r.due_mileage <= selectedCar.current_mileage)
  )
  const urgentPredictions = predictions.filter((p) => p.urgency !== 'ok')

  const heroBg = theme === 'dark' ? '#1E3A8A' : '#2563EB'
  const heroGlow = theme === 'dark' ? colors.activeTab : '#3B82F6'
  const heroText = '#FFFFFF'
  const heroMuted = theme === 'dark' ? '#93C5FD' : '#BFDBFE'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Custom header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ padding: 4 }}>
            <Ionicons
              name="menu"
              size={24}
              color={theme === 'dark' ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
            CarMind
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setShowCurrencyPicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.activeTab }}>{code}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 32, gap: 12 }}>
          {/* Hero Car Card */}
          {selectedCar ? (
            <View
              style={{
                backgroundColor: heroBg,
                borderRadius: 20,
                padding: 20,
                shadowColor: heroGlow,
                shadowOpacity: 0.2,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              {/* Carousel header */}
              {cars.length > 1 && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => switchCar(selectedCarIndex - 1)}
                    disabled={selectedCarIndex === 0}
                    style={{ padding: 4, opacity: selectedCarIndex === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-back" size={20} color={heroMuted} />
                  </TouchableOpacity>
                  <Text style={{ color: heroMuted, fontSize: 12, fontWeight: '600' }}>
                    {selectedCarIndex + 1} of {cars.length}
                  </Text>
                  <TouchableOpacity
                    onPress={() => switchCar(selectedCarIndex + 1)}
                    disabled={selectedCarIndex === cars.length - 1}
                    style={{ padding: 4, opacity: selectedCarIndex === cars.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color={heroMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Car info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: heroMuted,
                      fontSize: 11,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                    }}
                  >
                    Your Car
                  </Text>
                  <Text style={{ color: heroText, fontSize: 20, fontWeight: '700', marginTop: 2 }}>
                    {selectedCar.name}
                  </Text>
                  <Text style={{ color: heroMuted, fontSize: 13, marginTop: 2 }}>
                    {selectedCar.year} {selectedCar.make} {selectedCar.model}
                  </Text>
                </View>
                {selectedCar.license_plate ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.25)',
                    }}
                  >
                    <Text style={{ color: heroText, fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>
                      {selectedCar.license_plate}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Mileage */}
              <View style={{ marginTop: 20 }}>
                <Text style={{ color: heroMuted, fontSize: 11 }}>Current Mileage</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ color: heroText, fontSize: 40, fontWeight: '800', lineHeight: 48 }}>
                      {selectedCar.current_mileage.toLocaleString()}
                    </Text>
                    <Text style={{ color: heroMuted, fontSize: 16, fontWeight: '500' }}>km</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setMileageInput(selectedCar.current_mileage.toString())
                      setMileageError(null)
                      setShowMileageEdit(true)
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={heroMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dot indicator */}
              {cars.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  {cars.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => switchCar(i)}>
                      <View
                        style={{
                          width: i === selectedCarIndex ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            i === selectedCarIndex ? heroText : 'rgba(255,255,255,0.35)',
                        }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🚗</Text>
              <Text style={{ fontWeight: '600', color: colors.text, fontSize: 16 }}>No car yet</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Go to Cars tab to add your first car
              </Text>
            </View>
          )}

          {/* Stats Row */}
          {selectedCar && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.activeTab,
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '800', color: colors.activeTab }}>
                  {urgentPredictions.length}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Services Due</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderLeftWidth: 3,
                  borderLeftColor: RED,
                }}
              >
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: overdueReminders.length > 0 ? RED : colors.textMuted,
                  }}
                >
                  {overdueReminders.length}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Overdue</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderLeftWidth: 3,
                  borderLeftColor: AMBER,
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '800', color: AMBER }}>
                  {reminders.length}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Reminders</Text>
              </View>
            </View>
          )}

          {/* Services Due list */}
          {urgentPredictions.length > 0 && (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 12, fontSize: 15 }}>
                Services Due
              </Text>
              {urgentPredictions.map((p, i) => (
                <View
                  key={p.type}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: i < urgentPredictions.length - 1 ? 1 : 0,
                    borderBottomColor: colors.cardBorder,
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{p.label}</Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 100,
                      backgroundColor:
                        p.urgency === 'overdue'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)',
                      marginLeft: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: p.urgency === 'overdue' ? RED : AMBER,
                      }}
                    >
                      {p.urgency === 'overdue'
                        ? 'Overdue'
                        : `${p.kmRemaining.toLocaleString()} km`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Overdue reminders */}
          {overdueReminders.length > 0 && (
            <View
              style={{
                backgroundColor: 'rgba(245,158,11,0.1)',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <Text style={{ fontWeight: '700', color: AMBER, marginBottom: 8, fontSize: 15 }}>
                {overdueReminders.length} Overdue Reminder
                {overdueReminders.length !== 1 ? 's' : ''}
              </Text>
              {overdueReminders.slice(0, 3).map((r) => (
                <Text key={r.id} style={{ fontSize: 13, color: '#FCD34D', paddingVertical: 4 }}>
                  • {r.title}
                </Text>
              ))}
            </View>
          )}

          {/* All good state */}
          {selectedCar && urgentPredictions.length === 0 && overdueReminders.length === 0 && (
            <View
              style={{
                backgroundColor: 'rgba(16,185,129,0.1)',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(16,185,129,0.3)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                shadowColor: GREEN,
                shadowOpacity: 0.15,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text style={{ fontSize: 22 }}>✓</Text>
              <View>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>All good</Text>
                <Text style={{ fontSize: 13, color: '#6EE7B7', marginTop: 2 }}>
                  No services or reminders due
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setShowCurrencyPicker(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: colors.input,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
                borderTopWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
                Select Currency
              </Text>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => {
                    setCurrency(c.code)
                    setShowCurrencyPicker(false)
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                    opacity: code === c.code ? 1 : 0.75,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, width: 40 }}>
                      {c.symbol}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>{c.name}</Text>
                  </View>
                  {code === c.code && (
                    <Text style={{ color: colors.activeTab, fontWeight: '700', fontSize: 14 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mileage update success banner */}
      {mileageSaved && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 56,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(16,185,129,0.15)',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(16,185,129,0.4)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            zIndex: 100,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={GREEN} />
          <Text style={{ color: GREEN, fontWeight: '600', fontSize: 14 }}>Mileage updated</Text>
        </View>
      )}

      {/* Mileage quick-edit modal */}
      <Modal
        visible={showMileageEdit}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMileageEdit(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setShowMileageEdit(false)}
          >
            <Pressable onPress={() => {}}>
              <View
                style={{
                  backgroundColor: colors.input,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 24,
                  paddingBottom: insets.bottom + 24,
                  borderTopWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  Update Mileage
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
                  Current: {selectedCar?.current_mileage.toLocaleString()} km · {selectedCar?.name}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: '700',
                    borderWidth: 1,
                    borderColor: mileageError ? '#EF4444' : colors.cardBorder,
                    textAlign: 'center',
                  }}
                  value={mileageInput}
                  onChangeText={(v) => {
                    setMileageInput(v)
                    setMileageError(null)
                  }}
                  keyboardType="numeric"
                  placeholder={selectedCar?.current_mileage.toString() ?? '0'}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                {mileageError ? (
                  <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                    {mileageError}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => setShowMileageEdit(false)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveMileage}
                    disabled={savingMileage}
                    style={{
                      flex: 1,
                      backgroundColor: savingMileage ? colors.textMuted : colors.activeTab,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
                      {savingMileage ? 'Saving…' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
