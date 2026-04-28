import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '@/lib/supabase'
import { predictUpcomingServices } from '@automind/shared'
import type { Car, MaintenanceLog, ServicePrediction } from '@automind/shared'

export default function MaintenanceScreen() {
  const [car, setCar] = useState<Car | null>(null)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [predictions, setPredictions] = useState<ServicePrediction[]>([])
  const [refreshing, setRefreshing] = useState(false)

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
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4 space-y-4">
        {predictions.filter((p) => p.urgency !== 'ok').length > 0 && (
          <View className="bg-white rounded-2xl p-4 border border-gray-200">
            <Text className="font-semibold text-gray-900 mb-3">Service Predictions</Text>
            {predictions.filter((p) => p.urgency !== 'ok').map((p) => (
              <View key={p.type} className="flex-row justify-between items-center py-2">
                <Text className="text-sm text-gray-700">{p.label}</Text>
                <Text className={`text-xs font-medium ${p.urgency === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {p.urgency === 'overdue'
                    ? `${Math.abs(p.kmRemaining).toLocaleString()} km overdue`
                    : `${p.kmRemaining.toLocaleString()} km left`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl border border-gray-200">
          <View className="p-4 border-b border-gray-100">
            <Text className="font-semibold text-gray-900">Service History</Text>
          </View>
          {logs.length === 0 ? (
            <View className="p-6 items-center">
              <Text className="text-gray-400">No maintenance logged yet</Text>
            </View>
          ) : (
            logs.map((log, i) => (
              <View key={log.id} className={`p-4 ${i < logs.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">{log.title}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {log.service_date} · {log.mileage_at_service.toLocaleString()} km
                    </Text>
                  </View>
                  {log.cost !== undefined && log.cost !== null && (
                    <Text className="font-semibold text-gray-900">${Number(log.cost).toFixed(2)}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  )
}
