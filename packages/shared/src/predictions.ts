import type { MaintenanceLog, ServicePrediction } from './types'

export const SERVICE_INTERVALS_KM: Record<string, number> = {
  oil_change: 5000,
  tire_rotation: 10000,
  air_filter: 20000,
  brake_inspection: 30000,
  inspection: 20000,
}

const SERVICE_LABELS: Record<string, string> = {
  oil_change: 'Oil Change',
  tire_rotation: 'Tire Rotation',
  air_filter: 'Air Filter',
  brake_inspection: 'Brake Inspection',
  inspection: 'Inspection',
}

const SOON_THRESHOLD_KM = 500

export function predictUpcomingServices(
  maintenanceLogs: MaintenanceLog[],
  currentMileage: number
): ServicePrediction[] {
  const latestByType = new Map<string, MaintenanceLog>()

  for (const log of maintenanceLogs) {
    const existing = latestByType.get(log.type)
    if (!existing || log.mileage_at_service > existing.mileage_at_service) {
      latestByType.set(log.type, log)
    }
  }

  const predictions: ServicePrediction[] = []

  for (const [type, intervalKm] of Object.entries(SERVICE_INTERVALS_KM)) {
    const lastService = latestByType.get(type)
    const baseMileage = lastService?.mileage_at_service ?? 0
    const nextServiceMileage = lastService
      ? lastService.next_service_mileage ?? baseMileage + intervalKm
      : currentMileage + intervalKm

    const kmRemaining = nextServiceMileage - currentMileage
    let urgency: ServicePrediction['urgency'] = 'ok'
    if (kmRemaining <= 0) urgency = 'overdue'
    else if (kmRemaining <= SOON_THRESHOLD_KM) urgency = 'soon'

    predictions.push({
      type,
      label: SERVICE_LABELS[type] ?? type,
      nextServiceMileage,
      kmRemaining,
      urgency,
    })
  }

  return predictions.sort((a, b) => a.kmRemaining - b.kmRemaining)
}

export function suggestNextServiceMileage(type: string, currentMileage: number): number {
  const interval = SERVICE_INTERVALS_KM[type] ?? 10000
  return currentMileage + interval
}
