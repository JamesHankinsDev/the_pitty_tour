'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { requestPushPermission, savePushToken, listenForForegroundMessages } from '@/lib/firebase/messaging'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'

/**
 * Shows a one-time prompt to enable push notifications.
 * Auto-registers the token silently if permission was already granted.
 * Also sets up foreground message listener.
 */
export function PushPrompt() {
  const { user, isDemo } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    if (isDemo || !user || typeof window === 'undefined') return
    if (!('Notification' in window)) return

    // Set up foreground message listener
    const unsub = listenForForegroundMessages()

    // If already granted, silently refresh token
    if (Notification.permission === 'granted') {
      requestPushPermission().then((token) => {
        if (token) savePushToken(user.uid, token)
      })
      return () => { unsub?.() }
    }

    // If not yet asked, show the prompt (unless previously dismissed this session)
    if (Notification.permission === 'default') {
      const wasDismissed = sessionStorage.getItem('pity_push_dismissed')
      if (!wasDismissed) {
        // Delay slightly so it doesn't compete with page load
        const timer = setTimeout(() => setShowPrompt(true), 3000)
        return () => { clearTimeout(timer); unsub?.() }
      }
    }

    return () => { unsub?.() }
  }, [user, isDemo])

  const handleEnable = async () => {
    if (!user) return
    setEnabling(true)
    try {
      const token = await requestPushPermission()
      if (token) {
        await savePushToken(user.uid, token)
        setShowPrompt(false)
      }
    } catch {
      // Permission denied or error
    } finally {
      setEnabling(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowPrompt(false)
    sessionStorage.setItem('pity_push_dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-50">
      <Card className="shadow-xl border-green-200 bg-white">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Enable Push Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified when players submit rounds, attest your scores, or look for partners.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="green"
                  size="sm"
                  onClick={handleEnable}
                  disabled={enabling}
                >
                  {enabling ? 'Enabling...' : 'Enable'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
