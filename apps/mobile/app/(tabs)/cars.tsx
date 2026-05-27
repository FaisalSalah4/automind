import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Car } from '@automind/shared'
import { useTheme } from '@/lib/theme'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

interface CarFormState {
  name: string
  make: string
  model: string
  year: string
  current_mileage: string
  license_plate: string
}

const BLANK_FORM: CarFormState = {
  name: '',
  make: '',
  model: '',
  year: '',
  current_mileage: '',
  license_plate: '',
}

function carToForm(car: Car): CarFormState {
  return {
    name: car.name,
    make: car.make,
    model: car.model,
    year: car.year.toString(),
    current_mileage: car.current_mileage.toString(),
    license_plate: car.license_plate ?? '',
  }
}

function validateForm(form: CarFormState): string | null {
  if (!form.name.trim()) return 'Car name is required.'
  if (!form.make.trim()) return 'Make is required.'
  if (!form.model.trim()) return 'Model is required.'
  const year = parseInt(form.year)
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2)
    return 'Enter a valid year.'
  const km = parseInt(form.current_mileage)
  if (isNaN(km) || km < 0) return 'Enter a valid mileage.'
  return null
}

export default function CarsScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [cars, setCars] = useState<Car[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<CarFormState>(BLANK_FORM)
  const [adding, setAdding] = useState(false)

  const [editCar, setEditCar] = useState<Car | null>(null)
  const [editForm, setEditForm] = useState<CarFormState>(BLANK_FORM)
  const [editing, setEditing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })
    setCars(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleAdd() {
    const err = validateForm(addForm)
    if (err) { Alert.alert('Validation', err); return }

    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Error', 'Not authenticated.')
      setAdding(false)
      return
    }

    const { error } = await supabase.from('cars').insert({
      user_id: user.id,
      name: addForm.name.trim(),
      make: addForm.make.trim(),
      model: addForm.model.trim(),
      year: parseInt(addForm.year),
      current_mileage: parseInt(addForm.current_mileage),
      license_plate: addForm.license_plate.trim() || null,
    })

    setAdding(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setShowAdd(false)
      setAddForm(BLANK_FORM)
      await load()
    }
  }

  async function handleEdit() {
    if (!editCar) return
    const err = validateForm(editForm)
    if (err) { Alert.alert('Validation', err); return }

    setEditing(true)
    const { error } = await supabase
      .from('cars')
      .update({
        name: editForm.name.trim(),
        make: editForm.make.trim(),
        model: editForm.model.trim(),
        year: parseInt(editForm.year),
        current_mileage: parseInt(editForm.current_mileage),
        license_plate: editForm.license_plate.trim() || null,
      })
      .eq('id', editCar.id)

    setEditing(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setEditCar(null)
      await load()
    }
  }

  function renderFormFields(
    form: CarFormState,
    setForm: (f: CarFormState) => void
  ) {
    const inputStyle = {
      backgroundColor: colors.input,
      borderColor: colors.inputBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 15,
      marginBottom: 12,
    }
    const label = (text: string) => (
      <Text
        style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}
      >
        {text}
      </Text>
    )

    return (
      <>
        {label('Car Name *')}
        <TextInput
          style={inputStyle}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g. My Toyota"
          placeholderTextColor={colors.textMuted}
        />

        {label('Make *')}
        <TextInput
          style={inputStyle}
          value={form.make}
          onChangeText={(v) => setForm({ ...form, make: v })}
          placeholder="e.g. Toyota"
          placeholderTextColor={colors.textMuted}
        />

        {label('Model *')}
        <TextInput
          style={inputStyle}
          value={form.model}
          onChangeText={(v) => setForm({ ...form, model: v })}
          placeholder="e.g. Camry"
          placeholderTextColor={colors.textMuted}
        />

        {label('Year *')}
        <TextInput
          style={inputStyle}
          value={form.year}
          onChangeText={(v) => setForm({ ...form, year: v })}
          placeholder={`e.g. ${new Date().getFullYear()}`}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />

        {label('Current Mileage (km) *')}
        <TextInput
          style={inputStyle}
          value={form.current_mileage}
          onChangeText={(v) => setForm({ ...form, current_mileage: v })}
          placeholder="e.g. 45000"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />

        {label('License Plate')}
        <TextInput
          style={{ ...inputStyle, marginBottom: 20 }}
          value={form.license_plate}
          onChangeText={(v) => setForm({ ...form, license_plate: v })}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />
      </>
    )
  }

  const modalHeader = (title: string, onCancel: () => void) => (
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
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      <Pressable onPress={onCancel}>
        <Text style={{ color: colors.activeTab, fontSize: 16 }}>Cancel</Text>
      </Pressable>
    </View>
  )

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
          {/* Always-visible Add Car button */}
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            style={{
              backgroundColor: colors.activeTab,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>+ Add Car</Text>
          </TouchableOpacity>

          {cars.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🚗</Text>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>No cars yet</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Tap Add Car to get started
              </Text>
            </View>
          ) : (
            cars.map((car) => (
              <View
                key={car.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 17 }}>{car.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                      {car.year} {car.make} {car.model}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {car.license_plate ? (
                      <View
                        style={{
                          backgroundColor: colors.cardBorder,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{ color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}
                        >
                          {car.license_plate}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => {
                        setEditCar(car)
                        setEditForm(carToForm(car))
                      }}
                      style={{
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: colors.activeTab,
                      }}
                    >
                      <Text style={{ color: colors.activeTab, fontSize: 13, fontWeight: '600' }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.cardBorder,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Current Mileage</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {car.current_mileage.toLocaleString()} km
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Car Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.bg }}
        >
          {modalHeader('Add Car', () => { setShowAdd(false); setAddForm(BLANK_FORM) })}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {renderFormFields(addForm, setAddForm)}
            <TouchableOpacity
              onPress={handleAdd}
              disabled={adding}
              style={{
                backgroundColor: adding ? colors.textMuted : colors.activeTab,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              {adding ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>Add Car</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Car Modal */}
      <Modal visible={editCar !== null} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.bg }}
        >
          {modalHeader('Edit Car', () => setEditCar(null))}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {renderFormFields(editForm, setEditForm)}
            <TouchableOpacity
              onPress={handleEdit}
              disabled={editing}
              style={{
                backgroundColor: editing ? colors.textMuted : colors.activeTab,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              {editing ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 16 }}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
