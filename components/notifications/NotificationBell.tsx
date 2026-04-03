'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { dismissNotification } from '@/lib/firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Bell,
  Flag,
  CheckCircle2,
  Users,
  BarChart3,
  Shield,
  MessageSquare,
  X,
} from 'lucide-react'
import type { NotificationType } from '@/lib/types'

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'round_submitted': return Flag
    case 'round_attested': return CheckCircle2
    case 'round_validated': return CheckCircle2
    case 'lfg': return Users
    case 'leaderboard_change': return BarChart3
    case 'admin': return Shield
    default: return Bell
  }
}

function getNotifColor(type: NotificationType) {
  switch (type) {
    case 'round_submitted': return 'text-blue-600 bg-blue-50'
    case 'round_attested': return 'text-green-600 bg-green-50'
    case 'round_validated': return 'text-green-600 bg-green-50'
    case 'lfg': return 'text-yellow-600 bg-yellow-50'
    case 'leaderboard_change': return 'text-purple-600 bg-purple-50'
    case 'admin': return 'text-red-600 bg-red-50'
    default: return 'text-muted-foreground bg-muted'
  }
}

function timeAgo(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleOpen = () => {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      markAllRead()
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-14 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-2 lg:w-80 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold text-sm">Notifications</p>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-green-700 hover:underline"
            >
              View All
            </Link>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notif) => {
                const Icon = getNotifIcon(notif.type)
                const color = getNotifColor(notif.type)
                return (
                  <Link
                    key={notif.id}
                    href={notif.link ?? '/dashboard'}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-accent transition-colors border-b last:border-0"
                  >
                    {notif.actorPhotoURL ? (
                      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                        <AvatarImage src={notif.actorPhotoURL} />
                        <AvatarFallback>{notif.actorName?.[0] ?? '?'}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(notif.createdAt as any)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          dismissNotification(notif.id)
                        }}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
