import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { predictUpcomingServices } from '@automind/shared'
import type { Car, Reminder, ServicePrediction } from '@automind/shared'

export default function DashboardScreen() {
  const [cars, setCars] = useState<Car[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [predictions, setPredictions] = useState<ServicePrediction[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: carsData } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })

    setCars(carsData ?? [])

    const firstCar = carsData?.[0]
    if (firstCar) {
      const [{ data: maintenance }, { data: remindersData }] = await Promise.all([
        supabase
          .from('maintenance_logs')
          .select('*')
          .eq('car_id', firstCar.id)
          .order('mileage_at_service', { ascending: false })
          .limit(20),
        supabase
          .from('reminders')
          .select('*')
          .eq('is_done', false)
          .order('created_at', { ascending: false }),
      ])

      setPredictions(predictUpcomingServices(maintenance ?? [], firstCar.current_mileage))
      setReminders(remindersData ?? [])
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

  const firstCar = cars[0]
  const today = new Date().toISOString().split('T')[0]
  const overdueReminders = reminders.filter(
    (r) =>
      (r.type === 'date' && r.due_date && r.due_date < today) ||
      (r.type === 'mileage' && firstCar && r.due_mileage && r.due_mileage <= firstCar.current_mileage)
  )
  const urgentPredictions = predictions.filter((p) => p.urgency !== 'ok')

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        {firstCar ? (
          <View className="bg-blue-600 rounded-2xl p-5">
            <Text className="text-white text-lg font-bold">{firstCar.name}</Text>
            <Text className="text-blue-100 text-sm">
              {firstCar.year} {firstCar.make} {firstCar.model}
            </Text>
            <Text className="text-white text-3xl font-bold mt-2">
              {firstCar.current_mileage.toLocaleString()} km
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-5 border border-gray-200">
            <Text className="text-gray-500 text-center">No cars added yet</Text>
          </View>
        )}

        {urgentPredictions.length > 0 && (
          <View className="bg-white rounded-2xl p-4 border border-gray-200">
            <Text className="font-semibold text-gray-900 mb-3">Services Due</Text>
            {urgentPredictions.map((p) => (
              <View key={p.type} className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <Text className="text-sm text-gray-700">{p.label}</Text>
                <View className={`px-2 py-0.5 rounded-full ${p.urgency === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  <Text className={`text-xs font-medium ${p.urgency === 'overdue' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {p.urgency === 'overdue' ? 'Overdue' : `${p.kmRemaining.toLocaleString()} km`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {overdueReminders.length > 0 && (
          <View className="bg-red-50 rounded-2xl p-4 border border-red-200">
            <Text className="font-semibold text-red-800 mb-2">
              {overdueReminders.length} Overdue Reminder{overdueReminders.length !== 1 ? 's' : ''}
            </Text>
            {overdueReminders.slice(0, 3).map((r) => (
              <Text key={r.id} className="text-sm text-red-700 py-1">
                • {r.title}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
