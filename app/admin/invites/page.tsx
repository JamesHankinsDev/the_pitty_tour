'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createInvite, getAllInvites, revokeInvite } from '@/lib/firebase/invites'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatTimestampFull, formatTimestamp } from '@/lib/utils/dates'
import {
  Mail,
  Plus,
  Copy,
  Check,
  Clock,
  XCircle,
  CheckCircle2,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
import type { Invite } from '@/lib/types'
import { differenceInDays, differenceInHours } from 'date-fns'

export const dynamic = 'force-dynamic'

function StatusBadge({ invite }: { invite: Invite }) {
  const now = Date.now()
  const expired =
    invite.status === 'expired' || invite.expiresAt.toMillis() < now

  if (invite.status === 'used') {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Used
      </Badge>
    )
  }
  if (expired) {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Expired
      </Badge>
    )
  }
  return (
    <Badge variant="pending" className="flex items-center gap-1">
      <LinkIcon className="w-3 h-3" />
      Pending
    </Badge>
  )
}

function ExpiryText({ invite }: { invite: Invite }) {
  if (invite.status === 'used') {
    return (
      <span className="text-muted-foreground">
        Used by {invite.usedByEmail} · {formatTimestamp(invite.usedAt as any)}
      </span>
    )
  }

  const now = Date.now()
  const expiresMs = invite.expiresAt.toMillis()

  if (expiresMs < now || invite.status === 'expired') {
    return <span className="text-muted-foreground">Expired {formatTimestamp(invite.expiresAt as any)}</span>
  }

  const daysLeft = differenceInDays(expiresMs, now)
  const hoursLeft = differenceInHours(expiresMs, now)
  const timeLeft =
    daysLeft >= 1 ? `${daysLeft}d left` : `${hoursLeft}h left`

  return (
    <span className="text-muted-foreground">
      Expires {formatTimestamp(invite.expiresAt as any)} · {timeLeft}
    </span>
  )
}

export default function AdminInvitesPage() {
  const { profile } = useAuth()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [expiryDays, setExpiryDays] = useState(7)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? ''

  const loadInvites = async () => {
    setLoading(true)
    try {
      const all = await getAllInvites()
      setInvites(all)
    } catch {
      toast.error('Failed to load invites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvites()
  }, [])

  const handleCreate = async () => {
    if (!profile) return
    setCreating(true)
    try {
      const token = await createInvite(profile.uid, note, expiryDays)
      const url = `${appUrl}/invite/${token}`
      await navigator.clipboard.writeText(url)
      toast.success('Invite link created and copied to clipboard!')
      setNote('')
      setShowForm(false)
      loadInvites()
    } catch {
      toast.error('Failed to create invite.')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (token: string) => {
    const url = `${appUrl}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success('Invite link copied!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRevoke = async (token: string) => {
    try {
      await revokeInvite(token)
      toast.success('Invite revoked.')
      loadInvites()
    } catch {
      toast.error('Failed to revoke invite.')
    }
  }

  const pending = invites.filter(
    (i) => i.status === 'pending' && i.expiresAt.toMillis() > Date.now()
  )
  const used = invites.filter((i) => i.status === 'used')
  const expired = invites.filter(
    (i) => i.status === 'expired' || i.expiresAt.toMillis() <= Date.now()
  )

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-green-600" />
            Invite Links
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pending.length} pending · {used.length} used · {expired.length} expired
          </p>
        </div>
        <Button
          variant="green"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Invite
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generate Invite Link</CardTitle>
            <CardDescription>
              The link will be copied to your clipboard automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Label (optional)</Label>
              <Input
                id="note"
                placeholder='e.g. "For Mike T."'
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expires after (days)</Label>
              <Input
                id="expiry"
                type="number"
                min={1}
                max={30}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="green"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create & Copy Link'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No invite links yet. Generate one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => {
            const isActive =
              invite.status === 'pending' &&
              invite.expiresAt.toMillis() > Date.now()

            return (
              <Card
                key={invite.token}
                className={isActive ? 'border-green-200' : 'opacity-70'}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge invite={invite} />
                        {invite.note && (
                          <span className="text-sm font-medium">
                            {invite.note}
                          </span>
                        )}
                      </div>

                      <p className="text-xs">
                        <ExpiryText invite={invite} />
                      </p>

                      {/* Token URL (truncated) */}
                      {isActive && (
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {appUrl}/invite/{invite.token.slice(0, 12)}…
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Created {formatTimestampFull(invite.createdAt as any)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      {isActive && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(invite.token)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
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
