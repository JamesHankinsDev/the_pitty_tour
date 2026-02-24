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
import { User, Target, CreditCard } from 'lucide-react'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  handicapIndex: z
    .number({ invalid_type_error: 'Please enter a number' })
    .min(0, 'Minimum 0')
    .max(54, 'Maximum 54'),
  venmoHandle: z
    .string()
    .min(1, 'Venmo handle is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, underscores'),
})

type FormData = z.infer<typeof schema>

export function ProfileSetup() {
  const { profile, user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName ?? user?.displayName ?? '',
      handicapIndex: profile?.handicapIndex ?? undefined,
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
      toast.success('Profile saved! Welcome to the PITY Tour!')
    } catch (err) {
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-950 to-green-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 bg-green-600 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your PITY Tour member profile to start playing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="displayName"
                placeholder="e.g. Tiger Woods"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Handicap */}
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
                placeholder="e.g. 12.5"
                {...register('handicapIndex', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Your official GHIN/WHS handicap index (0–54)
              </p>
              {errors.handicapIndex && (
                <p className="text-xs text-destructive">
                  {errors.handicapIndex.message}
                </p>
              )}
            </div>

            {/* Venmo */}
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
                  placeholder="your-venmo-handle"
                  {...register('venmoHandle')}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for prize payouts — no @ symbol needed
              </p>
              {errors.venmoHandle && (
                <p className="text-xs text-destructive">
                  {errors.venmoHandle.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="green"
              size="lg"
              className="w-full"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Complete Profile & Join the Tour'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
