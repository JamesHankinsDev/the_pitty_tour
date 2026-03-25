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
import { User, Target, CreditCard, Search, CheckCircle2, AlertCircle, Info } from 'lucide-react'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  ghinNumber: z.string().min(1, 'GHIN number is required'),
  manualHandicap: z
    .number({ invalid_type_error: 'Please enter a number' })
    .min(0, 'Minimum 0')
    .max(54, 'Maximum 54')
    .optional(),
  venmoHandle: z
    .string()
    .min(1, 'Venmo handle is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, hyphens, underscores'),
})

type FormData = z.infer<typeof schema>

export function ProfileSetup() {
  const { profile, user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [handicapResult, setHandicapResult] = useState<number | null>(null)
  const [needsManualEntry, setNeedsManualEntry] = useState(false)
  const [ghinVerified, setGhinVerified] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile?.displayName ?? user?.displayName ?? '',
      ghinNumber: profile?.ghinNumber ?? '',
      venmoHandle: profile?.venmoHandle ?? '',
    },
  })

  const ghinNumber = watch('ghinNumber')
  const manualHandicap = watch('manualHandicap')

  const lookupHandicap = async () => {
    if (!ghinNumber.trim()) {
      setLookupError('Enter your GHIN number first.')
      return
    }

    setLookingUp(true)
    setLookupError(null)
    setHandicapResult(null)
    setNeedsManualEntry(false)
    setGhinVerified(false)

    try {
      const res = await fetch('/api/ghin/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghinNumber: ghinNumber.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLookupError(data.error ?? 'Lookup failed.')
        return
      }

      if (data.noHandicap || data.handicapIndex === null) {
        // GHIN returned "NH" — golfer exists but no established handicap
        setNeedsManualEntry(true)
        setGhinVerified(true)
        toast.info('GHIN account found, but no handicap on file. Enter it manually below.')
      } else {
        setHandicapResult(data.handicapIndex)
        setGhinVerified(true)
        toast.success(`Found! Handicap Index: ${data.handicapIndex}`)
      }
    } catch {
      setLookupError('Network error. Please try again.')
    } finally {
      setLookingUp(false)
    }
  }

  const effectiveHandicap = handicapResult ?? (needsManualEntry ? manualHandicap : null)
  const canSubmit = ghinVerified && typeof effectiveHandicap === 'number' && effectiveHandicap > 0

  const onSubmit = async (data: FormData) => {
    if (!user || !canSubmit) return

    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        displayName: data.displayName,
        ghinNumber: data.ghinNumber.trim(),
        handicapIndex: effectiveHandicap!,
        venmoHandle: data.venmoHandle,
      })
      await refreshProfile()
      toast.success('Profile saved! Welcome to the PITY Tour!')
    } catch {
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

            {/* GHIN Number + Lookup */}
            <div className="space-y-2">
              <Label htmlFor="ghinNumber" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                GHIN Number
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ghinNumber"
                  placeholder="e.g. 1234567"
                  {...register('ghinNumber')}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={lookupHandicap}
                  disabled={lookingUp}
                  className="shrink-0"
                >
                  {lookingUp ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your GHIN member number — we'll look up your official handicap.
              </p>
              {errors.ghinNumber && (
                <p className="text-xs text-destructive">
                  {errors.ghinNumber.message}
                </p>
              )}

              {/* Lookup result */}
              {handicapResult !== null && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm text-green-800 font-medium">
                    Handicap Index: {handicapResult}
                  </span>
                </div>
              )}

              {/* NH — manual entry fallback */}
              {needsManualEntry && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm text-blue-800">
                      GHIN shows "NH" (no handicap). Enter your handicap manually.
                    </span>
                  </div>
                  <Input
                    id="manualHandicap"
                    type="number"
                    step="0.1"
                    min="0"
                    max="54"
                    placeholder="e.g. 12.5"
                    {...register('manualHandicap', { valueAsNumber: true })}
                  />
                  {errors.manualHandicap && (
                    <p className="text-xs text-destructive">
                      {errors.manualHandicap.message}
                    </p>
                  )}
                </div>
              )}

              {/* Lookup error */}
              {lookupError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-sm text-red-800">{lookupError}</span>
                </div>
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
              disabled={saving || !canSubmit}
            >
              {saving ? 'Saving...' : 'Complete Profile & Join the Tour'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
