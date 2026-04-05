'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToUserFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} from '@/lib/firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  Plus,
  X,
  Trash2,
  Edit,
  Check,
} from 'lucide-react'
import type { Feedback, FeedbackType, FeedbackStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<FeedbackType, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-600 bg-red-50 border-red-200' },
  feature: { label: 'Idea', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  question: { label: 'Question', icon: HelpCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
}

const STATUS_META: Record<FeedbackStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'outline' | 'secondary' | 'destructive' | 'pending' }> = {
  new: { label: 'New', variant: 'secondary' },
  backlog: { label: 'In Backlog', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'pending' },
  completed: { label: 'Completed', variant: 'success' },
  rejected: { label: 'Declined', variant: 'outline' },
}

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function FeedbackPage() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<FeedbackType>('feature')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToUserFeedback(user.uid, (data) => {
      setItems(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  const resetForm = () => {
    setType('feature')
    setTitle('')
    setDescription('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !user || !profile) return
    setSubmitting(true)
    try {
      if (editingId) {
        await updateFeedback(editingId, {
          type,
          title: title.trim(),
          description: description.trim(),
        })
        toast.success('Feedback updated')
      } else {
        await createFeedback({
          uid: user.uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          type,
          title: title.trim(),
          description: description.trim(),
        })
        toast.success('Thanks for the feedback!')
      }
      resetForm()
    } catch {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: Feedback) => {
    setEditingId(item.id)
    setType(item.type)
    setTitle(item.title)
    setDescription(item.description)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback?')) return
    try {
      await deleteFeedback(id)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquarePlus className="w-6 h-6 text-green-600" />
            Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Report a bug, suggest an idea, or ask a question. Your feedback goes
            straight to the developer.
          </p>
        </div>
        {!showForm && (
          <Button variant="green" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        )}
      </div>

      {/* Submission form */}
      {showForm && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                {editingId ? 'Edit feedback' : 'New feedback'}
              </p>
              <button onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_META) as FeedbackType[]).map((t) => {
                  const meta = TYPE_META[t]
                  const Icon = meta.icon
                  const isSelected = type === t
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-md border text-xs font-medium transition-colors ${
                        isSelected
                          ? meta.color
                          : 'bg-background border-input text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary..."
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'bug'
                    ? 'What happened? What did you expect? Steps to reproduce?'
                    : type === 'feature'
                    ? 'Describe your idea and why it would be useful...'
                    : 'Ask your question...'
                }
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/2000
              </p>
            </div>

            <Button
              variant="green"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !description.trim()}
            >
              {submitting ? 'Submitting...' : editingId ? 'Save Changes' : 'Submit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback list */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Your submissions
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquarePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No feedback yet</p>
            <p className="text-sm mt-1">Share your first bug, idea, or question above.</p>
          </div>
        ) : (
          items.map((item) => {
            const typeMeta = TYPE_META[item.type]
            const statusMeta = STATUS_META[item.status]
            const TypeIcon = typeMeta.icon
            const canEdit = item.status === 'new'
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeMeta.color}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeMeta.label}
                      </span>
                      <Badge variant={statusMeta.variant} className="text-xs">
                        {statusMeta.label}
                      </Badge>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {timeAgo(item.createdAt as any)}
                  </p>

                  {item.adminResponse && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <p className="text-xs font-semibold text-green-700">
                          Developer response
                        </p>
                        <span className="text-xs text-muted-foreground">
                          · {timeAgo(item.respondedAt as any)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {item.adminResponse}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
