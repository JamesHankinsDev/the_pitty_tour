'use client'

import { useAuth } from '@/contexts/AuthContext'
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay'
import { Card, CardContent } from '@/components/ui/card'
import { Info, QrCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function MyQRPage() {
  const { profile, user } = useAuth()

  if (!profile || !user) return null

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6 text-green-600" />
          My QR Code
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Show this to playing partners so they can attest your rounds
        </p>
      </div>

      <div className="flex justify-center">
        <QRCodeDisplay
          value={profile.uid}
          displayName={profile.displayName}
          size={260}
          showActions
        />
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-green-800">
                How attestation works
              </p>
              <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                <li>Submit your round in the app after playing</li>
                <li>Show your QR code to each playing partner</li>
                <li>
                  They scan it with the app and confirm your score details
                </li>
                <li>2 attestations = valid round ✓</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Player ID: <span className="font-mono">{profile.uid.slice(0, 12)}...</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          This QR code is permanent and unique to you
        </p>
      </div>
    </div>
  )
}
