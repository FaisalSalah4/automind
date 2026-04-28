import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Car, Plus } from 'lucide-react'
import Link from 'next/link'
import { DeleteCarButton } from '@/components/cars/delete-car-button'

export default async function CarsPage() {
  const supabase = await createClient()
  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Cars</h1>
          <p className="text-muted-foreground">Manage your vehicles</p>
        </div>
        <Button asChild>
          <Link href="/cars/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Link>
        </Button>
      </div>

      {cars && cars.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <Card key={car.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{car.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {car.year} {car.make} {car.model}
                    </p>
                  </div>
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Mileage</span>
                  <span className="font-semibold">{car.current_mileage.toLocaleString()} km</span>
                </div>
                {car.license_plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plate</span>
                    <Badge variant="outline">{car.license_plate}</Badge>
                  </div>
                )}
                {car.purchase_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Purchased</span>
                    <span className="text-sm">{car.purchase_date}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/cars/${car.id}`}>View Details</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/cars/${car.id}/edit`}>Edit</Link>
                  </Button>
                  <DeleteCarButton carId={car.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cars yet</h3>
            <p className="text-muted-foreground mb-4">Add your first car to start tracking</p>
            <Button asChild>
              <Link href="/cars/new">Add a Car</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
