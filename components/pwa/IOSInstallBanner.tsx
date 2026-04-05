'use client'

import { useEffect, useState } from 'react'
import { X, Share } from 'lucide-react'

const DISMISS_KEY = 'pity_ios_install_dismissed'

// Lightweight banner that nudges iOS Safari users to add the app to their
// Home Screen (iOS doesn't fire the beforeinstallprompt event, so we have
// to do this manually). Hidden once already installed or dismissed.
export function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already dismissed this session/device
    if (localStorage.getItem(DISMISS_KEY)) return

    const ua = window.navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
    if (!isIOS) return

    // Already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Show after a short delay so it doesn't fight with onboarding
    const t = setTimeout(() => setShow(true), 4000)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed z-[110] left-3 right-3 bg-background border shadow-lg rounded-2xl p-4 flex items-start gap-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-white font-black text-lg">P</span>
      </div>
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold mb-0.5">Install PITY Tour</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Tap{' '}
          <Share className="w-3.5 h-3.5 inline-block text-blue-600 -mt-0.5" />{' '}
          then <span className="font-medium">Add to Home Screen</span> to use
          this app like a native one.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="p-1 -m-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
