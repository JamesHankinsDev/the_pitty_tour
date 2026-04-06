'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToAnnouncements,
  postAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Megaphone, Plus, Pin, Trash2, X, Edit } from 'lucide-react'
import type { Announcement } from '@/lib/types'


function timeAgo(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AnnouncementsPage() {
  const { profile, user } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canPost = profile?.isAdmin ||
    profile?.roles?.includes('commissioner') ||
    profile?.roles?.includes('secretary')

  useEffect(() => {
    const unsub = subscribeToAnnouncements((a) => {
      setAnnouncements(a)
      setLoading(false)
    })
    return unsub
  }, [])

  const handlePost = async () => {
    if (!title.trim() || !body.trim() || !user || !profile) return
    setSubmitting(true)
    try {
      await postAnnouncement({
        title: title.trim(),
        body: body.trim(),
        pinned,
        postedBy: user.uid,
        postedByName: profile.displayName,
      })
      setTitle('')
      setBody('')
      setPinned(false)
      setShowForm(false)
      toast.success('Announcement posted!')
    } catch {
      toast.error('Failed to post announcement.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id)
      toast.success('Announcement deleted.')
    } catch {
      toast.error('Failed to delete.')
    }
  }

  const handleTogglePin = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { pinned: !a.pinned })
    } catch {
      toast.error('Failed to update.')
    }
  }

  // Sort: pinned first, then by date
  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-green-600" />
            Announcements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Official updates from the Commissioner&apos;s Office
          </p>
        </div>
        {canPost && (
          <Button variant="green" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showForm ? 'Cancel' : 'Post'}
          </Button>
        )}
      </div>

      {/* Post form */}
      {showForm && canPost && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={1000}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPinned(!pinned)}
                className={`flex items-center gap-1.5 text-sm font-medium ${pinned ? 'text-yellow-700' : 'text-muted-foreground'}`}
              >
                <Pin className={`w-4 h-4 ${pinned ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {pinned ? 'Pinned' : 'Pin to top'}
              </button>
              <Button variant="green" onClick={handlePost} disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? 'Posting...' : 'Post Announcement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm mt-1">Official updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <Card key={a.id} className={a.pinned ? 'border-yellow-300 bg-yellow-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {a.pinned && (
                        <Pin className="w-3.5 h-3.5 text-yellow-600 fill-yellow-500" />
                      )}
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                      {a.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.postedByName} &middot; {timeAgo(a.createdAt as any)}
                    </p>
                  </div>
                  {canPost && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePin(a)}
                        className="p-1 text-muted-foreground hover:text-yellow-600 transition-colors"
                        title={a.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className={`w-4 h-4 ${a.pinned ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
