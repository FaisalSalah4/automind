import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Car, FuelLog } from '@automind/shared'
import { useCurrency } from '@/lib/currency'
import { useTheme } from '@/lib/theme'

interface FuelLogWithConsumption extends FuelLog {
  consumption: number | null
}

export default function FuelScreen() {
  const { colors } = useTheme()
  const [car, setCar] = useState<Car | null>(null)
  const [logs, setLogs] = useState<FuelLogWithConsumption[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { symbol } = useCurrency()

  const [liters, setLiters] = useState('')
  const [costPerLiter, setCostPerLiter] = useState('')
  const [mileage, setMileage] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: cars } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    const firstCar = cars?.[0]
    setCar(firstCar ?? null)

    if (firstCar) {
      setMileage(firstCar.current_mileage.toString())
      const { data: fuelData } = await supabase
        .from('fuel_logs')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('date', { ascending: false })
        .limit(20)

      const withConsumption = (fuelData ?? []).map((log, i) => {
        const prev = fuelData?.[i + 1]
        let consumption: number | null = null
        if (prev && log.full_tank && prev.full_tank) {
          const km = log.mileage - prev.mileage
          if (km > 0) consumption = (Number(log.liters) / km) * 100
        }
        return { ...log, consumption }
      })
      setLogs(withConsumption)
    }
  }

  useEffect(() => { load() }, [])
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function logFuel() {
    if (!car || !liters || !costPerLiter || !mileage) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const total = parseFloat(liters) * parseFloat(costPerLiter)
    await supabase.from('fuel_logs').insert({
      car_id: car.id,
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      liters: parseFloat(liters),
      cost_per_liter: parseFloat(costPerLiter),
      total_cost: total,
      mileage: parseInt(mileage),
      full_tank: true,
    })

    setLiters('')
    setCostPerLiter('')
    setSaving(false)
    load()
  }

  const total =
    liters && costPerLiter
      ? (parseFloat(liters) * parseFloat(costPerLiter)).toFixed(2)
      : null

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
      }
    >
      <View style={{ padding: 16, gap: 12 }}>
        {car && (
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
              Log Fill-up
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Liters</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="45.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={liters}
                  onChangeText={setLiters}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{symbol}/Liter</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="1.599"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={costPerLiter}
                  onChangeText={setCostPerLiter}
                />
              </View>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Odometer (km)</Text>
              <TextInput
                style={inputStyle}
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
                value={mileage}
                onChangeText={setMileage}
              />
            </View>
            {total && (
              <View
                style={{
                  backgroundColor: `${colors.activeTab}22`,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: colors.activeTab, fontSize: 14, fontWeight: '600' }}>
                  Total: {symbol}{total}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={{
                backgroundColor: saving ? colors.textMuted : colors.activeTab,
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
              }}
              onPress={logFuel}
              disabled={saving}
            >
              <Text style={{ color: colors.buttonText, fontWeight: '700', fontSize: 15 }}>
                {saving ? 'Saving…' : 'Log Fill-up'}
              </Text>
            </TouchableOpacity>
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
            <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>Fill-up History</Text>
          </View>
          {logs.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>No fill-ups logged yet</Text>
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
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{log.date}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {Number(log.liters).toFixed(1)} L · {log.mileage.toLocaleString()} km
                    </Text>
                    {log.consumption !== null && (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.activeTab, marginTop: 2 }}>
                        {log.consumption.toFixed(1)} L/100km
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>
                    {symbol}{Number(log.total_cost).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}
