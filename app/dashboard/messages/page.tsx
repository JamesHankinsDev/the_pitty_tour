'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  sendMessage,
  subscribeToMessages,
  deleteMessage,
  toggleMessageReaction,
  setLookingForPartner,
  subscribeToLFGPlayers,
  notifyAllPlayers,
  createNotification,
} from '@/lib/firebase/firestore'
import { sendPush, sendPushToAll } from '@/lib/firebase/push'
import { useUsers } from '@/contexts/UsersContext'
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
  SmilePlus,
} from 'lucide-react'
import type { Message, UserProfile } from '@/lib/types'
import { MESSAGE_REACTIONS } from '@/lib/types'

export const dynamic = 'force-dynamic'

function timeAgo(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Resolve @-mentions in a chunk of text against the known users list.
// Matches against each user's displayName (longest-first, so "John Smith"
// beats "John" when both exist). Returns the set of tagged uids.
function extractMentions(text: string, users: UserProfile[]): string[] {
  const uids = new Set<string>()
  // Sort longest first to prevent shorter names shadowing longer ones
  const sorted = [...users].sort((a, b) => b.displayName.length - a.displayName.length)
  for (const u of sorted) {
    if (!u.displayName) continue
    const escaped = u.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`@${escaped}(?![A-Za-z0-9_])`, 'g')
    if (re.test(text)) {
      uids.add(u.uid)
    }
  }
  return Array.from(uids)
}

// Render message text with @mentions styled. Any mentioned user's full
// displayName, preceded by @, gets a highlighted pill.
function renderWithMentions(
  text: string,
  mentionedUids: string[],
  users: UserProfile[],
  ownBubble: boolean
): React.ReactNode[] {
  if (mentionedUids.length === 0) return [text]
  const names = mentionedUids
    .map((uid) => users.find((u) => u.uid === uid)?.displayName)
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => b.length - a.length)
  if (names.length === 0) return [text]
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`@(${escaped.join('|')})(?![A-Za-z0-9_])`, 'g')
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    parts.push(
      <span
        key={`m-${i++}`}
        className={`font-semibold rounded px-1 ${
          ownBubble
            ? 'bg-white/20 text-white'
            : 'bg-green-100 text-green-800'
        }`}
      >
        {match[0]}
      </span>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function MessageBubble({
  msg,
  isOwn,
  isAdmin,
  currentUid,
  users,
  onDelete,
  onToggleReaction,
}: {
  msg: Message
  isOwn: boolean
  isAdmin: boolean
  currentUid: string | null
  users: UserProfile[]
  onDelete: (id: string) => void
  onToggleReaction: (id: string, emoji: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  // Close picker on outside click
  const pickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pickerOpen) return
    const handle = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [pickerOpen])

  const reactions = msg.reactions ?? {}
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0)

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
        <div className="group relative">
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
            <p className="whitespace-pre-wrap break-words">
              {renderWithMentions(msg.text, msg.mentions ?? [], users, isOwn && msg.type !== 'lfg')}
            </p>
          </div>

          {/* React button */}
          {currentUid && (
            <button
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Add reaction"
              className={`absolute top-1/2 -translate-y-1/2 ${
                isOwn ? '-left-7' : '-right-7'
              } opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground`}
            >
              <SmilePlus className="w-4 h-4" />
            </button>
          )}

          {/* Emoji picker popover */}
          {pickerOpen && (
            <div
              ref={pickerRef}
              className={`absolute z-20 top-full mt-1 ${
                isOwn ? 'right-0' : 'left-0'
              } bg-background border rounded-full shadow-lg px-1.5 py-1 flex items-center gap-0.5`}
            >
              {MESSAGE_REACTIONS.map((emoji) => {
                const active = (reactions[emoji] ?? []).includes(currentUid ?? '')
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(msg.id, emoji)
                      setPickerOpen(false)
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-lg transition-transform hover:scale-125 ${
                      active ? 'bg-green-100' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Reaction chips */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, uids]) => {
              const mine = currentUid ? uids.includes(currentUid) : false
              return (
                <button
                  key={emoji}
                  onClick={() => currentUid && onToggleReaction(msg.id, emoji)}
                  disabled={!currentUid}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs transition-colors ${
                    mine
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-background border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{uids.length}</span>
                </button>
              )
            })}
          </div>
        )}

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
  const { users } = useUsers()
  const [messages, setMessages] = useState<Message[]>([])
  const [lfgPlayers, setLfgPlayers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // @-mention autocomplete state. `mentionQuery` is the partial string
  // after @ (or null if not actively picking). `mentionStart` is the index
  // of the @ character in the text so we can replace it on selection.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [mentionIndex, setMentionIndex] = useState(0)

  const mentionMatches = mentionQuery === null
    ? []
    : users
        .filter((u) =>
          u.uid !== user?.uid &&
          u.displayName?.toLowerCase().includes(mentionQuery.toLowerCase())
        )
        .slice(0, 6)

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
    const body = text.trim()
    const mentions = extractMentions(body, users).filter((uid) => uid !== user.uid)
    try {
      await sendMessage(
        user.uid,
        profile.displayName,
        profile.photoURL,
        body,
        'chat',
        mentions
      )
      setText('')
      setMentionQuery(null)

      // Fire-and-forget mention notifications
      if (mentions.length > 0) {
        const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body
        for (const uid of mentions) {
          createNotification({
            recipientUid: uid,
            type: 'mention',
            title: `${profile.displayName} mentioned you`,
            body: preview,
            link: '/dashboard/messages',
            actorUid: user.uid,
            actorName: profile.displayName,
            actorPhotoURL: profile.photoURL,
          }).catch(() => {})
        }
        sendPush({
          recipientUids: mentions,
          title: `${profile.displayName} mentioned you`,
          body: preview,
          link: '/dashboard/messages',
        })
      }
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

  const handleToggleReaction = async (id: string, emoji: string) => {
    if (!user || !profile) return
    try {
      const result = await toggleMessageReaction(id, emoji, user.uid)
      // Notify the author only when a reaction was newly added, and skip self-reactions
      if (result?.added && result.authorUid !== user.uid) {
        const title = `${profile.displayName} reacted ${emoji}`
        const msg = messages.find((m) => m.id === id)
        const snippet = msg?.text
          ? msg.text.length > 80 ? `${msg.text.slice(0, 80)}…` : msg.text
          : 'to your message'
        createNotification({
          recipientUid: result.authorUid,
          type: 'reaction',
          title,
          body: snippet,
          link: '/dashboard/messages',
          actorUid: user.uid,
          actorName: profile.displayName,
          actorPhotoURL: profile.photoURL,
        }).catch(() => {})
        sendPush({
          recipientUids: [result.authorUid],
          title,
          body: snippet,
          link: '/dashboard/messages',
        })
      }
    } catch {
      toast.error('Failed to react.')
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
        const lfgBody = note
          ? `${profile.displayName} is looking for a partner: "${note}"`
          : `${profile.displayName} is looking for a playing partner!`
        notifyAllPlayers({
          type: 'lfg',
          title: 'Looking for Partner',
          body: lfgBody,
          link: '/dashboard/messages',
          actorUid: user.uid,
          actorName: profile.displayName,
          actorPhotoURL: profile.photoURL,
        }, user.uid).catch(() => {})
        sendPushToAll(user.uid, {
          title: 'Looking for Partner',
          body: lfgBody,
          link: '/dashboard/messages',
        })
      } else {
        toast.success('Looking for Partner turned off.')
      }
    } catch {
      toast.error('Failed to update status.')
    }
  }

  // Detect active @query before the cursor so we can show the autocomplete
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setText(value)
    const cursor = e.target.selectionStart ?? value.length
    const upto = value.slice(0, cursor)
    const atIdx = upto.lastIndexOf('@')
    if (atIdx === -1) {
      setMentionQuery(null)
      return
    }
    // Must be at start-of-string or preceded by whitespace
    const prevChar = atIdx > 0 ? upto[atIdx - 1] : ' '
    if (prevChar !== ' ' && prevChar !== '\n' && atIdx !== 0) {
      setMentionQuery(null)
      return
    }
    const query = upto.slice(atIdx + 1)
    // No spaces allowed in an active query (user has moved past the mention)
    if (/[\n]/.test(query) || query.length > 30) {
      setMentionQuery(null)
      return
    }
    // Only activate if user is still typing the name (allow letters, spaces, digits)
    if (!/^[A-Za-z0-9 ]*$/.test(query)) {
      setMentionQuery(null)
      return
    }
    setMentionQuery(query)
    setMentionStart(atIdx)
    setMentionIndex(0)
  }

  const applyMention = (u: UserProfile) => {
    if (mentionQuery === null) return
    const before = text.slice(0, mentionStart)
    const after = text.slice(mentionStart + 1 + mentionQuery.length)
    const inserted = `@${u.displayName} `
    const next = `${before}${inserted}${after}`
    setText(next)
    setMentionQuery(null)
    // Move cursor to just after inserted mention
    const newCursor = (before + inserted).length
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursor, newCursor)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Autocomplete navigation takes priority
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % mentionMatches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applyMention(mentionMatches[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }
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
                  currentUid={user?.uid ?? null}
                  users={users}
                  onDelete={handleDelete}
                  onToggleReaction={handleToggleReaction}
                />
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2 relative">
            {/* Mention autocomplete */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute left-3 right-16 bottom-full mb-2 bg-background border rounded-lg shadow-lg overflow-hidden z-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-2 pb-1">
                  Mention
                </p>
                {mentionMatches.map((u, i) => (
                  <button
                    key={u.uid}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      applyMention(u)
                    }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      i === mentionIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback className="text-xs">
                        {u.displayName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.displayName}</span>
                  </button>
                ))}
              </div>
            )}

            <Input
              ref={inputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setMentionQuery(null), 100)}
              placeholder="Type a message… use @ to mention"
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
