'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { subscribeToPollComments, addPollComment } from '@/lib/firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { PollComment } from '@/lib/types'

interface PollCommentThreadProps {
  pollId: string
}

function timeAgo(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function PollCommentThread({ pollId }: PollCommentThreadProps) {
  const { user } = useAuth()
  const { users } = useUsers()
  const [comments, setComments] = useState<PollComment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const unsub = subscribeToPollComments(pollId, setComments)
    return unsub
  }, [pollId])

  const userMap = new Map(users.map((u) => [u.uid, u]))

  const handleSend = async () => {
    if (!text.trim() || !user) return
    setSending(true)
    try {
      await addPollComment(pollId, user.uid, text)
      setText('')
    } catch {
      toast.error('Failed to post comment.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        Comments ({comments.length})
      </h3>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Add a comment..."
          className="flex-1"
          maxLength={300}
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

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No comments yet. Start the discussion!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const commenter = userMap.get(comment.userId)
            return (
              <div key={comment.id} className="flex gap-2.5">
                <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                  <AvatarImage src={commenter?.photoURL} />
                  <AvatarFallback>
                    {commenter?.displayName?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {commenter?.displayName ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.createdAt as any)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {comment.text}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
