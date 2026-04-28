'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Car {
  id: string
  year: number
  make: string
  model: string
}

interface CarSelectorProps {
  cars: Car[]
  selectedCarId: string
  basePath: string
}

export function CarSelector({ cars, selectedCarId, basePath }: CarSelectorProps) {
  const router = useRouter()

  return (
    <Select
      value={selectedCarId}
      onValueChange={(id) => router.push(`${basePath}?carId=${id}`)}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cars.map((car) => (
          <SelectItem key={car.id} value={car.id}>
            {car.year} {car.make} {car.model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
