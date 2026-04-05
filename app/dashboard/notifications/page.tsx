'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { dismissNotification } from '@/lib/firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  Bell,
  Flag,
  CheckCircle2,
  Users,
  BarChart3,
  Shield,
  X,
  AtSign,
  Smile,
} from 'lucide-react'
import type { NotificationType } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'round_submitted': return Flag
    case 'round_attested': return CheckCircle2
    case 'round_validated': return CheckCircle2
    case 'lfg': return Users
    case 'leaderboard_change': return BarChart3
    case 'admin': return Shield
    case 'mention': return AtSign
    case 'reaction': return Smile
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
    case 'mention': return 'text-green-600 bg-green-50'
    case 'reaction': return 'text-pink-600 bg-pink-50'
    default: return 'text-muted-foreground bg-muted'
  }
}

function formatTime(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const date = new Date(ts.seconds * 1000)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 172800) return 'yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const { notifications, loading, markAllRead } = useNotifications()

  // Mark all read when page opens
  useEffect(() => {
    markAllRead()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-green-600" />
          Notifications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">
            You'll be notified when players submit rounds, attest your scores,
            or look for partners.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = getNotifIcon(notif.type)
            const color = getNotifColor(notif.type)

            return (
              <Link key={notif.id} href={notif.link ?? '/dashboard'}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex gap-3">
                    {notif.actorPhotoURL ? (
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={notif.actorPhotoURL} />
                        <AvatarFallback>{notif.actorName?.[0] ?? '?'}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notif.createdAt as any)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              dismissNotification(notif.id)
                            }}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                            aria-label="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notif.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
