'use client'

import { useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface QRCodeDisplayProps {
  value: string
  displayName: string
  size?: number
  showActions?: boolean
}

export function QRCodeDisplay({
  value,
  displayName,
  size = 240,
  showActions = true,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null)

  const downloadQR = useCallback(async () => {
    if (!qrRef.current) return

    try {
      const svg = qrRef.current.querySelector('svg')
      if (!svg) return

      const svgData = new XMLSerializer().serializeToString(svg)
      const canvas = document.createElement('canvas')
      const padding = 40
      canvas.width = size + padding * 2
      canvas.height = size + padding * 2 + 50

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR
      const img = new Image()
      const blob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        ctx.drawImage(img, padding, padding, size, size)

        // Draw name
        ctx.fillStyle = '#166534'
        ctx.font = 'bold 18px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(displayName, canvas.width / 2, size + padding + 30)

        ctx.fillStyle = '#6b7280'
        ctx.font = '12px sans-serif'
        ctx.fillText('PITY Tour Member', canvas.width / 2, size + padding + 48)

        // Download
        const link = document.createElement('a')
        link.download = `pity-tour-qr-${displayName.replace(/\s+/g, '-').toLowerCase()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()

        URL.revokeObjectURL(url)
        toast.success('QR Code downloaded!')
      }

      img.src = url
    } catch {
      toast.error('Download failed. Please try again.')
    }
  }, [size, displayName])

  const shareQR = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s PITY Tour QR Code`,
          text: `Scan my QR code to attest my round on the PITY Tour app.`,
        })
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy UID to clipboard
      await navigator.clipboard.writeText(value)
      toast.success('Player ID copied to clipboard!')
    }
  }, [displayName, value])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div
        ref={qrRef}
        className="bg-white p-5 rounded-2xl shadow-lg border-2 border-green-100"
      >
        <QRCodeSVG
          value={value}
          size={size}
          bgColor="#ffffff"
          fgColor="#14532d"
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '',
            height: 0,
            width: 0,
            excavate: false,
          }}
        />
      </div>

      {/* Player name */}
      <div className="text-center">
        <p className="font-bold text-lg">{displayName}</p>
        <p className="text-xs text-muted-foreground">PITY Tour Member</p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={shareQR}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  )
}
