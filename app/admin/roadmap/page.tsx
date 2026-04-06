'use client'

import { useState, useEffect } from 'react'
import {
  subscribeToAllFeedback,
  respondToFeedback,
  updateFeedback,
  deleteFeedback,
} from '@/lib/firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Map,
  Bug,
  Lightbulb,
  HelpCircle,
  Trash2,
  Send,
  Mail,
} from 'lucide-react'
import type { Feedback, FeedbackType, FeedbackStatus } from '@/lib/types'


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

const STATUS_OPTIONS: FeedbackStatus[] = ['new', 'backlog', 'in_progress', 'completed', 'rejected']
const TYPE_OPTIONS: Array<FeedbackType | 'all'> = ['all', 'bug', 'feature', 'question']

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminRoadmapPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all')
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToAllFeedback((data) => {
      setItems(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    return true
  })

  const counts = {
    total: items.length,
    new: items.filter((i) => i.status === 'new').length,
    backlog: items.filter((i) => i.status === 'backlog').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  }

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      await updateFeedback(id, { status })
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRespond = async (item: Feedback, newStatus?: FeedbackStatus) => {
    const draft = (responseDrafts[item.id] ?? item.adminResponse ?? '').trim()
    if (!draft) {
      toast.error('Add a response first')
      return
    }
    setSavingId(item.id)
    try {
      await respondToFeedback(item.id, draft, newStatus ?? item.status)
      toast.success('Response saved')
      setResponseDrafts((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
    } catch {
      toast.error('Failed to save response')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this feedback permanently?')) return
    try {
      await deleteFeedback(id)
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="w-6 h-6 text-green-600" />
          Future Roadmap
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Player feedback — triage, respond, and plan ahead.
        </p>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <StatPill label="Total" value={counts.total} />
        <StatPill label="New" value={counts.new} highlight={counts.new > 0} />
        <StatPill label="Backlog" value={counts.backlog} />
        <StatPill label="Active" value={counts.in_progress} />
        <StatPill label="Done" value={counts.completed} />
        <StatPill label="Declined" value={counts.rejected} />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {t === 'all' ? 'All Types' : TYPE_META[t].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            All Statuses
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No feedback matching filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const typeMeta = TYPE_META[item.type]
            const statusMeta = STATUS_META[item.status]
            const TypeIcon = typeMeta.icon
            const draft = responseDrafts[item.id] ?? item.adminResponse ?? ''
            const hasChanges = draft.trim() !== (item.adminResponse ?? '').trim()

            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
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
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(item.createdAt as any)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Submitter */}
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={item.photoURL} />
                      <AvatarFallback className="text-xs">
                        {item.displayName?.[0] ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{item.displayName}</span>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>

                  {/* Status selector */}
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(item.id, s)}
                        disabled={item.status === s}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          item.status === s
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>

                  {/* Response editor */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        Reply to {item.displayName.split(' ')[0]}
                      </p>
                      {item.respondedAt && (
                        <span className="text-xs text-muted-foreground">
                          Last sent {timeAgo(item.respondedAt as any)}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={draft}
                      onChange={(e) =>
                        setResponseDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a response that the player will see on their feedback page..."
                      className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      maxLength={1000}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="green"
                        size="sm"
                        onClick={() => handleRespond(item)}
                        disabled={!hasChanges || savingId === item.id || !draft.trim()}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {savingId === item.id
                          ? 'Saving...'
                          : item.adminResponse
                          ? 'Update Reply'
                          : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-center border ${
        highlight ? 'bg-green-50 border-green-200' : 'bg-muted/40 border-transparent'
      }`}
    >
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
