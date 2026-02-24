'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile } from '@/lib/firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatTimestamp } from '@/lib/utils/dates'
import { User, Target, CreditCard, Calendar, QrCode, Trophy } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
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

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      handicapIndex: profile?.handicapIndex ?? 0,
      venmoHandle: profile?.venmoHandle ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!user) return
    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        handicapIndex: data.handicapIndex,
        venmoHandle: data.venmoHandle,
      })
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

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
          <CardDescription>
            Update your name, handicap, and Venmo handle
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
    </div>
  )
}
