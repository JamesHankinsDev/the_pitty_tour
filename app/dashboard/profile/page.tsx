'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile, recordHandicapSnapshot } from '@/lib/firebase/firestore'
import { HandicapChart } from '@/components/charts/HandicapChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatTimestamp } from '@/lib/utils/dates'
import { User, Target, CreditCard, Calendar, QrCode, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  ghinNumber: z.string().min(1, 'GHIN number is required'),
  handicapIndex: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .min(0, 'Min 0')
    .max(54, 'Max 54'),
  venmoHandle: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, underscores'),
})

type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [refreshingGhin, setRefreshingGhin] = useState(false)
  const [ghinError, setGhinError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      ghinNumber: profile?.ghinNumber ?? '',
      handicapIndex: profile?.handicapIndex ?? 0,
      venmoHandle: profile?.venmoHandle ?? '',
    },
  })

  const ghinNumber = watch('ghinNumber')

  const refreshHandicap = async () => {
    if (!user || !ghinNumber.trim()) {
      setGhinError('Enter your GHIN number first.')
      return
    }

    setRefreshingGhin(true)
    setGhinError(null)

    try {
      const res = await fetch('/api/ghin/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghinNumber: ghinNumber.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setGhinError(data.error ?? 'Lookup failed.')
        return
      }

      if (data.noHandicap || data.handicapIndex === null) {
        setGhinError('GHIN shows "NH" (no established handicap). Update your handicap manually below.')
        return
      }

      await updateUserProfile(user.uid, {
        ghinNumber: ghinNumber.trim(),
        handicapIndex: data.handicapIndex,
      })
      await refreshProfile()
      toast.success(`Handicap updated to ${data.handicapIndex}`)
    } catch {
      setGhinError('Network error. Please try again.')
    } finally {
      setRefreshingGhin(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setSaving(true)
    try {
      const oldIndex = profile?.handicapIndex ?? 0
      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        ghinNumber: data.ghinNumber.trim(),
        handicapIndex: data.handicapIndex,
        venmoHandle: data.venmoHandle,
      })
      // Record handicap history if it changed
      if (data.handicapIndex !== oldIndex && data.handicapIndex > 0) {
        await recordHandicapSnapshot(user.uid, data.handicapIndex, 'manual')
      }
      await refreshProfile()
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your PITY Tour account
        </p>
      </div>

      {/* Avatar & Member Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.photoURL} />
              <AvatarFallback className="text-xl">
                {profile?.displayName?.[0] ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{profile?.displayName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Member since {formatTimestamp(profile?.memberSince as any)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-green-700">
                {profile?.totalPoints ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">
                {profile?.handicapIndex ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">Handicap</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-700">
                @{profile?.venmoHandle || '—'}
              </p>
              <p className="text-xs text-muted-foreground">Venmo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GHIN Handicap Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            GHIN Handicap
          </CardTitle>
          <CardDescription>
            Your handicap is automatically pulled from GHIN on each sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Handicap Index</p>
              <p className="text-2xl font-bold text-green-700">
                {profile?.handicapIndex ?? '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">GHIN #</p>
              <p className="text-sm font-mono font-medium">
                {profile?.ghinNumber || '—'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={refreshHandicap}
            disabled={refreshingGhin || !ghinNumber.trim()}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshingGhin ? 'animate-spin' : ''}`} />
            {refreshingGhin ? 'Refreshing...' : 'Refresh Handicap from GHIN'}
          </Button>

          {ghinError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm text-red-800">{ghinError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
          <CardDescription>
            Update your name, GHIN number, and Venmo handle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input id="displayName" {...register('displayName')} />
              {errors.displayName && (
                <p className="text-xs text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ghinNumber" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                GHIN Number
              </Label>
              <Input
                id="ghinNumber"
                placeholder="e.g. 1234567"
                {...register('ghinNumber')}
              />
              <p className="text-xs text-muted-foreground">
                Your GHIN member number for automatic handicap updates
              </p>
              {errors.ghinNumber && (
                <p className="text-xs text-destructive">
                  {errors.ghinNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="handicapIndex" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Handicap Index
              </Label>
              <Input
                id="handicapIndex"
                type="number"
                step="0.1"
                min="0"
                max="54"
                {...register('handicapIndex', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Auto-updated from GHIN on sign-in. Edit manually if needed.
              </p>
              {errors.handicapIndex && (
                <p className="text-xs text-destructive">
                  {errors.handicapIndex.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venmoHandle" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Venmo Handle
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  id="venmoHandle"
                  className="pl-7"
                  {...register('venmoHandle')}
                />
              </div>
              {errors.venmoHandle && (
                <p className="text-xs text-destructive">
                  {errors.venmoHandle.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="green"
              disabled={saving || !isDirty}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* QR Code shortcut */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Your QR Code</p>
                <p className="text-xs text-muted-foreground">
                  Share for attestation
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/my-qr">View QR</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Handicap Trend */}
      {user && (
        <HandicapChart
          uid={user.uid}
          currentIndex={profile?.handicapIndex ?? 0}
        />
      )}
    </div>
  )
}
