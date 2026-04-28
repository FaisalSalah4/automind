import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Car } from '@automind/shared'

export default function CarsScreen() {
  const [cars, setCars] = useState<Car[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('cars').select('*').order('created_at', { ascending: false })
    setCars(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-3">
        {cars.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
            <Text className="text-gray-400 text-center">No cars yet. Add one from the web app.</Text>
          </View>
        ) : (
          cars.map((car) => (
            <View key={car.id} className="bg-white rounded-2xl p-4 border border-gray-200">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="font-bold text-gray-900 text-lg">{car.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {car.year} {car.make} {car.model}
                  </Text>
                </View>
                {car.license_plate && (
                  <View className="bg-gray-100 rounded-lg px-3 py-1">
                    <Text className="text-xs font-mono font-semibold">{car.license_plate}</Text>
                  </View>
                )}
              </View>
              <View className="mt-3 pt-3 border-t border-gray-100 flex-row justify-between">
                <Text className="text-sm text-gray-500">Current Mileage</Text>
                <Text className="text-sm font-semibold">{car.current_mileage.toLocaleString()} km</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
