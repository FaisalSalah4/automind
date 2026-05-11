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
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Car, Reminder } from '@automind/shared'
import { useTheme } from '@/lib/theme'

const AMBER = '#F59E0B'
const RED = '#EF4444'
const GREEN = '#10B981'

type ReminderType = 'date' | 'mileage'

function getStatus(r: Reminder, car: Car | null, today: string): 'done' | 'overdue' | 'active' {
  if (r.is_done) return 'done'
  if (r.type === 'date' && r.due_date && r.due_date < today) return 'overdue'
  if (r.type === 'mileage' && car && r.due_mileage && r.due_mileage <= car.current_mileage)
    return 'overdue'
  return 'active'
}

export default function RemindersScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [car, setCar] = useState<Car | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('date')
  const [dueDate, setDueDate] = useState('')
  const [dueMileage, setDueMileage] = useState('')

  const today = new Date().toISOString().split('T')[0]

  async function load() {
    const { data: cars } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    const firstCar = cars?.[0] ?? null
    setCar(firstCar)

    if (firstCar) {
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('created_at', { ascending: false })
      setReminders(data ?? [])
    } else {
      setReminders([])
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
    setType('date')
    setDueDate('')
    setDueMileage('')
  }

  async function handleSubmit() {
    if (!car) return
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return }
    if (type === 'date' && !dueDate.trim()) {
      Alert.alert('Required', 'Please enter a due date (YYYY-MM-DD).')
      return
    }
    if (type === 'mileage' && (!dueMileage.trim() || isNaN(Number(dueMileage)))) {
      Alert.alert('Required', 'Please enter a valid mileage.')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    await supabase.from('reminders').insert({
      car_id: car.id,
      user_id: user.id,
      type,
      title: title.trim(),
      due_date: type === 'date' ? dueDate.trim() : null,
      due_mileage: type === 'mileage' ? parseInt(dueMileage) : null,
      is_done: false,
    })

    setSubmitting(false)
    setShowForm(false)
    resetForm()
    load()
  }

  async function markDone(id: string, current: boolean) {
    await supabase.from('reminders').update({ is_done: !current }).eq('id', id)
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, is_done: !current } : r))
  }

  async function deleteReminder(id: string) {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('reminders').delete().eq('id', id)
          setReminders((prev) => prev.filter((r) => r.id !== id))
        },
      },
    ])
  }

  const overdueCount = reminders.filter(
    (r) => getStatus(r, car, today) === 'overdue'
  ).length

  const inputStyle = {
    backgroundColor: colors.input,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
        }
      >
        {/* Summary bar */}
        {overdueCount > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle" size={18} color={RED} />
            <Text style={{ color: RED, fontWeight: '600', fontSize: 14 }}>
              {overdueCount} overdue reminder{overdueCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* No car */}
        {!car && (
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
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Add a car first to create reminders</Text>
          </View>
        )}

        {/* Reminder list */}
        {reminders.length > 0 && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              overflow: 'hidden',
            }}
          >
            {reminders.map((r, i) => {
              const status = getStatus(r, car, today)
              const statusColor =
                status === 'done' ? colors.textMuted :
                status === 'overdue' ? RED : colors.activeTab
              const statusLabel =
                status === 'done' ? 'Done' :
                status === 'overdue' ? 'Overdue' : 'Active'

              return (
                <View
                  key={r.id}
                  style={{
                    padding: 14,
                    borderBottomWidth: i < reminders.length - 1 ? 1 : 0,
                    borderBottomColor: colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  {/* Done toggle */}
                  <TouchableOpacity
                    onPress={() => markDone(r.id, r.is_done)}
                    style={{ marginTop: 2 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={r.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={r.is_done ? GREEN : colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: r.is_done ? colors.textMuted : colors.text,
                        textDecorationLine: r.is_done ? 'line-through' : 'none',
                      }}
                    >
                      {r.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      {/* Type badge */}
                      <View
                        style={{
                          backgroundColor: `${colors.activeTab}22`,
                          borderRadius: 6,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.activeTab }}>
                          {r.type === 'date' ? 'DATE' : 'MILEAGE'}
                        </Text>
                      </View>
                      {/* Due value */}
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {r.type === 'date'
                          ? r.due_date ?? '—'
                          : r.due_mileage
                            ? `${r.due_mileage.toLocaleString()} km`
                            : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Status + delete */}
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View
                      style={{
                        backgroundColor: `${statusColor}22`,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                        {statusLabel}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteReminder(r.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {car && reminders.length === 0 && (
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
            <Ionicons name="notifications-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>No reminders yet</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {car && (
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 24,
            right: 20,
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
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color={colors.buttonText} />
        </TouchableOpacity>
      )}

      {/* Add Reminder modal */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowForm(false); resetForm() }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => { setShowForm(false); resetForm() }}
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
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                  New Reminder
                </Text>

                {/* Title */}
                <View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Title</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="e.g. Oil change at 90,000 km"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                </View>

                {/* Type toggle */}
                <View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>Trigger type</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(['date', 'mileage'] as ReminderType[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setType(t)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: type === t ? colors.activeTab : colors.card,
                          borderWidth: 1,
                          borderColor: type === t ? colors.activeTab : colors.cardBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: '600',
                            fontSize: 14,
                            color: type === t ? colors.buttonText : colors.text,
                          }}
                        >
                          {t === 'date' ? 'By Date' : 'By Mileage'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Conditional field */}
                {type === 'date' ? (
                  <View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                      Due date (YYYY-MM-DD)
                    </Text>
                    <TextInput
                      style={inputStyle}
                      placeholder={today}
                      placeholderTextColor={colors.textMuted}
                      value={dueDate}
                      onChangeText={setDueDate}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                      Due at mileage (km)
                    </Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="90000"
                      placeholderTextColor={colors.textMuted}
                      value={dueMileage}
                      onChangeText={setDueMileage}
                      keyboardType="number-pad"
                    />
                    {car && (
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                        Current mileage: {car.current_mileage.toLocaleString()} km
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: submitting ? colors.textMuted : colors.activeTab,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
                    {submitting ? 'Saving…' : 'Add Reminder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
