export type Car = {
  id: string
  name: string
  make: string
  model: string
  year: number
  license_plate?: string
  current_mileage: number
  purchase_date?: string
  created_at?: string
}

export type MaintenanceLog = {
  id: string
  car_id: string
  user_id?: string
  type: 'oil_change' | 'tire_rotation' | 'inspection' | 'repair' | 'other'
  title: string
  description?: string
  mileage_at_service: number
  cost?: number
  service_date: string
  next_service_mileage?: number
  invoice_url?: string
  created_at?: string
}

export type FuelLog = {
  id: string
  car_id: string
  user_id?: string
  date: string
  liters: number
  cost_per_liter: number
  total_cost: number
  mileage: number
  full_tank: boolean
  notes?: string
  created_at?: string
}

export type Reminder = {
  id: string
  car_id: string
  user_id?: string
  type: 'mileage' | 'date'
  title: string
  due_mileage?: number
  due_date?: string
  is_done: boolean
  created_at?: string
}

export type ServicePrediction = {
  type: string
  label: string
  nextServiceMileage: number
  kmRemaining: number
  urgency: 'overdue' | 'soon' | 'ok'
}
