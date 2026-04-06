'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createElection } from '@/lib/firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Vote, ArrowLeft } from 'lucide-react'
import Link from 'next/link'


const OFFICES = [
  { key: 'commissioner', title: 'Commissioner' },
  { key: 'treasurer', title: 'Treasurer' },
  { key: 'secretary', title: 'Secretary' },
  { key: 'handicap_chair', title: 'Handicap Chair' },
  { key: 'master_at_arms', title: 'Master at Arms' },
]

export default function NewElectionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [officeKey, setOfficeKey] = useState('')
  const [description, setDescription] = useState('')
  const [nominationsOpenAt, setNominationsOpenAt] = useState('')
  const [nominationsCloseAt, setNominationsCloseAt] = useState('')
  const [votingOpenAt, setVotingOpenAt] = useState('')
  const [votingCloseAt, setVotingCloseAt] = useState('')

  const selectedOffice = OFFICES.find((o) => o.key === officeKey)

  const handleSubmit = async () => {
    if (!user || !officeKey) return
    if (!nominationsOpenAt || !nominationsCloseAt || !votingOpenAt || !votingCloseAt) {
      toast.error('All dates are required')
      return
    }

    const nomOpen = new Date(nominationsOpenAt)
    const nomClose = new Date(nominationsCloseAt)
    const voteOpen = new Date(votingOpenAt)
    const voteClose = new Date(votingCloseAt)

    if (nomClose <= nomOpen || voteOpen < nomClose || voteClose <= voteOpen) {
      toast.error('Dates must be in order: nom open < nom close <= vote open < vote close')
      return
    }

    setSubmitting(true)
    try {
      await createElection({
        type: 'election',
        title: `${selectedOffice!.title} Election`,
        officeTitle: selectedOffice!.title,
        officeKey,
        description: description.trim() || `Election for the position of ${selectedOffice!.title}`,
        status: 'nomination',
        allowMemberOptions: false,
        opensAt: Timestamp.fromDate(nomOpen),
        closesAt: Timestamp.fromDate(voteClose),
        nominationsOpenAt: Timestamp.fromDate(nomOpen),
        nominationsCloseAt: Timestamp.fromDate(nomClose),
        votingOpenAt: Timestamp.fromDate(voteOpen),
        votingCloseAt: Timestamp.fromDate(voteClose),
        createdBy: user.uid,
      })
      toast.success('Election created!')
      router.push('/admin/elections')
    } catch {
      toast.error('Failed to create election.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/admin/elections" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back to Elections
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="w-6 h-6 text-green-600" />
          Create Election
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Election Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Office</Label>
            <Select value={officeKey} onValueChange={setOfficeKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select an office..." />
              </SelectTrigger>
              <SelectContent>
                {OFFICES.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context for this election..."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nominations Open</Label>
              <Input type="datetime-local" value={nominationsOpenAt} onChange={(e) => setNominationsOpenAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nominations Close</Label>
              <Input type="datetime-local" value={nominationsCloseAt} onChange={(e) => setNominationsCloseAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Voting Opens</Label>
              <Input type="datetime-local" value={votingOpenAt} onChange={(e) => setVotingOpenAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Voting Closes</Label>
              <Input type="datetime-local" value={votingCloseAt} onChange={(e) => setVotingCloseAt(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="green"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || !officeKey}
      >
        {submitting ? 'Creating...' : 'Create Election'}
      </Button>
    </div>
  )
}
