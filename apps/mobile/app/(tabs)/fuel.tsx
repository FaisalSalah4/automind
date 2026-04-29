import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Car, FuelLog } from '@automind/shared'
import { useCurrency } from '@/lib/currency'

interface FuelLogWithConsumption extends FuelLog {
  consumption: number | null
}

export default function FuelScreen() {
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

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        {car && (
          <View className="bg-white rounded-2xl p-4 border border-gray-200">
            <Text className="font-semibold text-gray-900 mb-3">Log Fill-up</Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">Liters</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                  placeholder="45.5"
                  keyboardType="decimal-pad"
                  value={liters}
                  onChangeText={setLiters}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 mb-1">{symbol}/Liter</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                  placeholder="1.599"
                  keyboardType="decimal-pad"
                  value={costPerLiter}
                  onChangeText={setCostPerLiter}
                />
              </View>
            </View>
            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1">Odometer (km)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                keyboardType="number-pad"
                value={mileage}
                onChangeText={setMileage}
              />
            </View>
            {total && (
              <View className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
                <Text className="text-blue-700 text-sm font-medium">Total: {symbol}{total}</Text>
              </View>
            )}
            <TouchableOpacity
              className="bg-blue-600 rounded-lg py-3 items-center"
              onPress={logFuel}
              disabled={saving}
            >
              <Text className="text-white font-semibold">
                {saving ? 'Saving…' : 'Log Fill-up'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-white rounded-2xl border border-gray-200">
          <View className="p-4 border-b border-gray-100">
            <Text className="font-semibold text-gray-900">Fill-up History</Text>
          </View>
          {logs.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-gray-400">No fill-ups logged yet</Text>
            </View>
          ) : (
            logs.map((log, i) => (
              <View key={log.id} className={`p-4 ${i < logs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-sm font-medium text-gray-900">{log.date}</Text>
                    <Text className="text-xs text-gray-500">
                      {Number(log.liters).toFixed(1)} L · {log.mileage.toLocaleString()} km
                    </Text>
                    {log.consumption !== null && (
                      <Text className="text-xs text-blue-600 font-medium">
                        {log.consumption.toFixed(1)} L/100km
                      </Text>
                    )}
                  </View>
                  <Text className="font-semibold text-gray-900">
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
