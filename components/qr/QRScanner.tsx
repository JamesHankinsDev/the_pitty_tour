'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface QRScannerProps {
  onScan: (value: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scannedRef = useRef(false)

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch {
        // Already stopped
      }
    }
    setScanning(false)
    setLoading(false)
  }

  const startScanner = async () => {
    scannedRef.current = false
    setLoading(true)

    try {
      const scanner = new Html5Qrcode('qr-reader-container')
      scannerRef.current = scanner

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        toast.error('No camera found on this device.')
        setLoading(false)
        return
      }

      // Prefer back camera
      const camera =
        cameras.find(
          (c) =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
        ) ?? cameras[0]

      await scanner.start(
        camera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (scannedRef.current) return
          scannedRef.current = true
          stopScanner().then(() => {
            onScan(decodedText)
          })
        },
        () => {
          // QR not found yet — ignore
        }
      )

      setScanning(true)
      setLoading(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoading(false)

      if (msg.toLowerCase().includes('permission')) {
        toast.error('Camera permission denied. Please allow camera access.')
      } else {
        toast.error('Could not start camera. Check permissions.')
      }

      onError?.(msg)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera preview area */}
      <div className="relative w-full max-w-sm">
        {!scanning && !loading && (
          <div className="w-full aspect-square bg-muted rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed">
            <CameraOff className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Camera is off. Tap the button below to start scanning.
            </p>
          </div>
        )}

        {loading && (
          <div className="w-full aspect-square bg-muted rounded-xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        )}

        {/* QR reader mounts here */}
        <div
          id="qr-reader-container"
          ref={containerRef}
          className={`w-full rounded-xl overflow-hidden ${!scanning ? 'hidden' : ''}`}
        />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br" />
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-green-400 opacity-75 animate-[scan_2s_linear_infinite]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control button */}
      {!scanning && !loading && (
        <Button variant="green" size="lg" onClick={startScanner} className="w-full max-w-sm">
          <Camera className="w-5 h-5 mr-2" />
          Start Camera
        </Button>
      )}

      {scanning && (
        <Button
          variant="outline"
          size="lg"
          onClick={stopScanner}
          className="w-full max-w-sm"
        >
          <CameraOff className="w-5 h-5 mr-2" />
          Stop Camera
        </Button>
      )}

      {scanning && (
        <p className="text-sm text-muted-foreground text-center">
          Point your camera at the player's QR code
        </p>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  )
}
