'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  sendMessage,
  subscribeToMessages,
  deleteMessage,
  setLookingForPartner,
  subscribeToLFGPlayers,
  notifyAllPlayers,
} from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  MessageSquare,
  Send,
  Users,
  MapPin,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { Message, UserProfile } from '@/lib/types'

export const dynamic = 'force-dynamic'

function timeAgo(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function MessageBubble({
  msg,
  isOwn,
  isAdmin,
  onDelete,
}: {
  msg: Message
  isOwn: boolean
  isAdmin: boolean
  onDelete: (id: string) => void
}) {
  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-8 h-8 shrink-0 mt-1">
        <AvatarImage src={msg.photoURL} />
        <AvatarFallback>{msg.displayName[0]}</AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-medium ${isOwn ? 'text-green-700' : 'text-muted-foreground'}`}>
            {isOwn ? 'You' : msg.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(msg.createdAt as any)}
          </span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm ${
            msg.type === 'lfg'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
              : isOwn
              ? 'bg-green-600 text-white'
              : 'bg-muted text-foreground'
          }`}
        >
          {msg.type === 'lfg' && (
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3 h-3" />
              <span className="text-xs font-semibold uppercase tracking-wide">Looking for Partner</span>
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
        {(isOwn || isAdmin) && (
          <button
            onClick={() => onDelete(msg.id)}
            className="text-xs text-muted-foreground hover:text-red-500 mt-0.5 px-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function LFGPanel({
  lfgPlayers,
  profile,
  onToggle,
}: {
  lfgPlayers: UserProfile[]
  profile: UserProfile | null
  onToggle: (looking: boolean, note: string) => void
}) {
  const [note, setNote] = useState(profile?.lookingForPartnerNote ?? '')
  const [isLooking, setIsLooking] = useState(profile?.lookingForPartner ?? false)

  // Sync if profile changes externally (e.g. on login)
  useEffect(() => {
    setIsLooking(profile?.lookingForPartner ?? false)
  }, [profile?.lookingForPartner])

  return (
    <Card className={isLooking ? 'border-yellow-300 bg-yellow-50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-yellow-600" />
          Looking for Partner
          {lfgPlayers.length > 0 && (
            <Badge variant="warning" className="ml-auto">
              {lfgPlayers.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newLooking = !isLooking
              setIsLooking(newLooking)
              onToggle(newLooking, newLooking ? note : '')
            }}
            className="flex items-center gap-2 text-sm font-medium"
          >
            {isLooking ? (
              <ToggleRight className="w-8 h-8 text-yellow-600" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            )}
            {isLooking ? 'You are looking for a partner' : 'Find a playing partner'}
          </button>
        </div>

        {isLooking && (
          <div className="flex gap-2">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="When & where? e.g. Saturday AM at Bethpage"
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(true, note)}
            >
              Update
            </Button>
          </div>
        )}

        {/* Active LFG players */}
        {lfgPlayers.length > 0 && (
          <div className="space-y-2 pt-1">
            {lfgPlayers.map((p) => (
              <div
                key={p.uid}
                className="flex items-center gap-2.5 p-2 bg-white rounded-lg border"
              >
                <Avatar className="w-7 h-7">
                  <AvatarImage src={p.photoURL} />
                  <AvatarFallback>{p.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.displayName}</p>
                  {p.lookingForPartnerNote && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.lookingForPartnerNote}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(p.lookingForPartnerAt as any)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MessagesPage() {
  const { profile, user, isDemo } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [lfgPlayers, setLfgPlayers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }
    const unsubMsgs = subscribeToMessages((msgs) => {
      setMessages(msgs)
      setLoading(false)
    })
    const unsubLfg = subscribeToLFGPlayers(setLfgPlayers)
    return () => {
      unsubMsgs()
      unsubLfg()
    }
  }, [isDemo])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !profile || !user) return
    setSending(true)
    try {
      await sendMessage(
        user.uid,
        profile.displayName,
        profile.photoURL,
        text
      )
      setText('')
    } catch {
      toast.error('Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMessage(id)
    } catch {
      toast.error('Failed to delete message.')
    }
  }

  const handleLFGToggle = async (looking: boolean, note: string) => {
    if (!user || !profile) return
    try {
      await setLookingForPartner(user.uid, looking, note)
      if (looking) {
        // Also post an LFG message to the board
        await sendMessage(
          user.uid,
          profile.displayName,
          profile.photoURL,
          note || `${profile.displayName} is looking for a playing partner!`,
          'lfg'
        )
        toast.success('Looking for Partner is on! Other players can see you.')

        // Notify all players
        notifyAllPlayers({
          type: 'lfg',
          title: 'Looking for Partner',
          body: note
            ? `${profile.displayName} is looking for a partner: "${note}"`
            : `${profile.displayName} is looking for a playing partner!`,
          link: '/dashboard/messages',
          actorUid: user.uid,
          actorName: profile.displayName,
          actorPhotoURL: profile.photoURL,
        }, user.uid).catch(() => {})
      } else {
        toast.success('Looking for Partner turned off.')
      }
    } catch {
      toast.error('Failed to update status.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-600" />
          Tour Board
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Chat with the tour &middot; find a playing partner
        </p>
      </div>

      {/* LFG Panel */}
      <LFGPanel
        lfgPlayers={lfgPlayers}
        profile={profile}
        onToggle={handleLFGToggle}
      />

      {/* Messages */}
      <Card className="flex flex-col" style={{ height: 'calc(100vh - 420px)', minHeight: '300px' }}>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Message list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.uid === user?.uid}
                  isAdmin={profile?.isAdmin ?? false}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
              maxLength={500}
              disabled={sending}
            />
            <Button
              variant="green"
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() || sending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
