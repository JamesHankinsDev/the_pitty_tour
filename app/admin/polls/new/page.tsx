'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createPoll } from '@/lib/firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Vote, Plus, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NewPollPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [allowMemberOptions, setAllowMemberOptions] = useState(false)
  const [options, setOptions] = useState<string[]>(['', ''])

  const addOption = () => setOptions([...options, ''])
  const removeOption = (i: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }
  const updateOption = (i: number, value: string) => {
    const next = [...options]
    next[i] = value
    setOptions(next)
  }

  const validOptions = options.filter((o) => o.trim())

  const handleSubmit = async () => {
    if (!user) return
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!description.trim()) { toast.error('Description is required'); return }
    if (!opensAt || !closesAt) { toast.error('Open and close dates are required'); return }
    if (validOptions.length < 2) { toast.error('At least 2 options are required'); return }

    const opensDate = new Date(opensAt)
    const closesDate = new Date(closesAt)
    if (closesDate <= opensDate) { toast.error('Close date must be after open date'); return }

    setSubmitting(true)
    try {
      await createPoll(
        {
          type: 'content',
          title: title.trim(),
          description: description.trim(),
          status: 'active',
          allowMemberOptions,
          opensAt: Timestamp.fromDate(opensDate),
          closesAt: Timestamp.fromDate(closesDate),
          createdBy: user.uid,
        },
        validOptions.map((o) => o.trim())
      )
      toast.success('Poll created!')
      router.push('/admin/polls')
    } catch {
      toast.error('Failed to create poll.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/admin/polls" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back to Polls
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="w-6 h-6 text-green-600" />
          Create Poll
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Poll Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Where should we play in June?"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you're polling for..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opens At</Label>
              <Input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Closes At</Label>
              <Input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAllowMemberOptions(!allowMemberOptions)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                allowMemberOptions ? 'bg-green-600' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                allowMemberOptions ? 'translate-x-5.5 left-0.5' : 'left-0.5'
              }`}
              style={{ transform: allowMemberOptions ? 'translateX(22px)' : 'translateX(0)' }}
              />
            </button>
            <div>
              <p className="text-sm font-medium">Allow member suggestions</p>
              <p className="text-xs text-muted-foreground">Members can suggest additional options</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Options</CardTitle>
          <CardDescription>Add at least 2 options for members to vote on</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="w-4 h-4 mr-1" />
            Add Option
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="green"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? 'Creating...' : 'Create Poll'}
      </Button>
    </div>
  )
}
