'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToNotifications,
  subscribeToReadCursor,
  markNotificationsRead,
} from '@/lib/firebase/firestore'
import type { Notification } from '@/lib/types'

export function useNotifications() {
  const { user, isDemo } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !user) {
      setLoading(false)
      return
    }

    let unsubNotifs: (() => void) | undefined
    let unsubCursor: (() => void) | undefined

    try {
      unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
        setNotifications(notifs)
        setLoading(false)
      })
    } catch (err) {
      console.warn('Notification subscription failed:', err)
      setLoading(false)
    }

    try {
      unsubCursor = subscribeToReadCursor(user.uid, setLastReadAt)
    } catch (err) {
      console.warn('Read cursor subscription failed:', err)
    }

    return () => {
      unsubNotifs?.()
      unsubCursor?.()
    }
  }, [user, isDemo])

  const unreadCount = useMemo(() => {
    if (!lastReadAt) return notifications.length
    return notifications.filter((n) => {
      const createdAt = n.createdAt as any
      if (!createdAt?.seconds) return true
      return new Date(createdAt.seconds * 1000) > lastReadAt
    }).length
  }, [notifications, lastReadAt])

  const markAllRead = async () => {
    if (!user) return
    try {
      await markNotificationsRead(user.uid)
    } catch (err) {
      console.warn('Failed to mark notifications read:', err)
    }
  }

  return { notifications, unreadCount, loading, markAllRead }
}
