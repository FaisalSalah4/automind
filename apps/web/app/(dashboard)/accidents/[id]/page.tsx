import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, MapPin, Gauge, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { DeleteAccidentButton } from '@/components/accidents/delete-accident-button'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_repair: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  settled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_repair: 'In Repair',
  settled: 'Settled',
  closed: 'Closed',
}

function formatPart(part: string) {
  return part
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function AccidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const { data: accident } = await supabase
    .from('accident_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (!accident) notFound()

  // Generate signed URLs for photos
  const photoSignedUrls: string[] = []
  const photoPaths: string[] = accident.photo_urls ?? []
  for (const path of photoPaths) {
    const { data } = await supabase.storage
      .from('accident-photos')
      .createSignedUrl(path, 3600)
    if (data?.signedUrl) photoSignedUrls.push(data.signedUrl)
  }

  const damagedParts: string[] = accident.damaged_parts ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/accidents"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accidents
          </Link>
          <h1 className="text-2xl font-bold">{accident.title}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                STATUS_STYLES[accident.status] ?? STATUS_STYLES.closed
              }`}
            >
              {STATUS_LABELS[accident.status] ?? accident.status}
            </span>
            <span className="text-sm text-muted-foreground">{accident.date}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/accidents/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DeleteAccidentButton accidentId={id} />
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Incident Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {accident.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{accident.location}</span>
            </div>
          )}
          {accident.mileage_at_accident != null && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{Number(accident.mileage_at_accident).toLocaleString()} km</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">At Fault</p>
              <p className="font-medium">
                {accident.at_fault === null
                  ? '—'
                  : accident.at_fault
                    ? 'Yes'
                    : 'No'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Third Party</p>
              <p className="font-medium">
                {accident.third_party_involved ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          {accident.police_report_number && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Police Report #</p>
              <p className="font-medium">{accident.police_report_number}</p>
            </div>
          )}
          {accident.insurance_claim_number && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Insurance Claim #</p>
              <p className="font-medium">{accident.insurance_claim_number}</p>
            </div>
          )}
          {accident.description && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Description</p>
              <p className="whitespace-pre-wrap">{accident.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Damaged Parts */}
      {damagedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Damaged Parts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {damagedParts.map((part) => (
                <Badge
                  key={part}
                  variant="secondary"
                  className="text-sm"
                >
                  {formatPart(part)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Costs */}
      {(accident.total_repair_cost != null ||
        accident.insurance_covered != null ||
        accident.out_of_pocket != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {accident.total_repair_cost != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Repair Cost</span>
                <span className="font-semibold">
                  {currencySymbol}{Number(accident.total_repair_cost).toFixed(2)}
                </span>
              </div>
            )}
            {accident.insurance_covered != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance Covered</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {currencySymbol}{Number(accident.insurance_covered).toFixed(2)}
                </span>
              </div>
            )}
            {accident.out_of_pocket != null && (
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Out of Pocket</span>
                <span className="font-bold text-destructive">
                  {currencySymbol}{Number(accident.out_of_pocket).toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {photoSignedUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photoSignedUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Accident photo ${i + 1}`}
                    className="w-full h-32 object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
