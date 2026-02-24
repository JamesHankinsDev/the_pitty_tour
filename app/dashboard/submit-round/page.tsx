'use client'

import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { submitRound } from '@/lib/firebase/firestore'
import {
  calculateNetScore,
  calculateDifferential,
  calculateCourseHandicap,
} from '@/lib/utils/scoring'
import { getCurrentMonthKey, formatMonthKey, daysRemainingInMonth } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Flag,
  Calculator,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const schema = z.object({
  courseName: z.string().min(2, 'Course name required'),
  courseRating: z
    .number({ invalid_type_error: 'Enter course rating' })
    .min(55, 'Too low')
    .max(80, 'Too high'),
  slopeRating: z
    .number({ invalid_type_error: 'Enter slope rating' })
    .min(55, 'Min 55')
    .max(155, 'Max 155'),
  grossScore: z
    .number({ invalid_type_error: 'Enter gross score' })
    .min(55, 'Score too low')
    .max(200, 'Score too high'),
  notes: z.string().max(300, 'Max 300 characters').optional(),
})

type FormData = z.infer<typeof schema>

export default function SubmitRoundPage() {
  const { profile, user } = useAuth()
  const { season } = useActiveSeason()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const currentMonth = getCurrentMonthKey()
  const daysLeft = daysRemainingInMonth()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      courseRating: 72.0,
      slopeRating: 113,
      grossScore: undefined,
    },
  })

  const watchedValues = useWatch({ control })
  const { courseRating, slopeRating, grossScore } = watchedValues

  // Live calculations
  const handicapIndex = profile?.handicapIndex ?? 0
  const courseHandicap =
    slopeRating && !isNaN(slopeRating)
      ? calculateCourseHandicap(handicapIndex, slopeRating)
      : null
  const netScore =
    grossScore && slopeRating && !isNaN(grossScore) && !isNaN(slopeRating)
      ? calculateNetScore(grossScore, handicapIndex, slopeRating)
      : null
  const differential =
    grossScore && courseRating && slopeRating &&
    !isNaN(grossScore) && !isNaN(courseRating) && !isNaN(slopeRating)
      ? calculateDifferential(grossScore, courseRating, slopeRating)
      : null

  const onSubmit = async (data: FormData) => {
    if (!user || !profile || !season) {
      toast.error('No active season found. Contact an admin.')
      return
    }
    if (courseHandicap === null || netScore === null || differential === null) {
      toast.error('Please fill in all score fields.')
      return
    }

    setSubmitting(true)
    try {
      await submitRound({
        uid: user.uid,
        seasonId: season.id,
        month: currentMonth,
        courseName: data.courseName,
        courseRating: data.courseRating,
        slopeRating: data.slopeRating,
        grossScore: data.grossScore,
        netScore,
        differentialScore: differential,
        notes: data.notes ?? '',
      })
      setSubmitted(true)
      toast.success('Round submitted! Now get 2 partners to attest it.')
    } catch (err) {
      toast.error('Failed to submit round. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 lg:p-8 max-w-md mx-auto">
        <div className="text-center space-y-4 py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Round Submitted!</h2>
          <p className="text-muted-foreground">
            Your round is pending attestation. You need 1 playing partner to
            scan your QR code and confirm your score.
          </p>
          <div className="flex flex-col gap-3 pt-4">
            <Button variant="green" asChild>
              <a href="/dashboard/my-qr">
                Show My QR Code
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/my-rounds">View My Rounds</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6 text-green-600" />
          Submit Round
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">
            {formatMonthKey(currentMonth)}
          </p>
          <Badge variant={daysLeft <= 7 ? 'destructive' : 'pending'}>
            {daysLeft} days left
          </Badge>
        </div>
      </div>

      {!season && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex gap-2">
            <Info className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">
              No active season found. Please contact an admin to set up the
              current season.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Course Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="e.g. Augusta National"
                {...register('courseName')}
              />
              {errors.courseName && (
                <p className="text-xs text-destructive">
                  {errors.courseName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseRating">Course Rating</Label>
                <Input
                  id="courseRating"
                  type="number"
                  step="0.1"
                  placeholder="72.0"
                  {...register('courseRating', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">From scorecard</p>
                {errors.courseRating && (
                  <p className="text-xs text-destructive">
                    {errors.courseRating.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slopeRating">Slope Rating</Label>
                <Input
                  id="slopeRating"
                  type="number"
                  placeholder="113"
                  {...register('slopeRating', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">From scorecard</p>
                {errors.slopeRating && (
                  <p className="text-xs text-destructive">
                    {errors.slopeRating.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Score</CardTitle>
            <CardDescription>
              Your handicap index: {handicapIndex}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grossScore">Gross Score (total strokes)</Label>
              <Input
                id="grossScore"
                type="number"
                placeholder="e.g. 92"
                className="text-2xl h-14 font-bold text-center"
                {...register('grossScore', { valueAsNumber: true })}
              />
              {errors.grossScore && (
                <p className="text-xs text-destructive">
                  {errors.grossScore.message}
                </p>
              )}
            </div>

            {/* Live calculated values */}
            {netScore !== null && (
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-4 h-4 text-green-700" />
                  <span className="text-sm font-semibold text-green-800">
                    Auto-Calculated
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-green-800">
                      {courseHandicap}
                    </p>
                    <p className="text-xs text-green-600">Course HCP</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-800">
                      {netScore}
                    </p>
                    <p className="text-xs text-green-600">Net Score</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-800">
                      {differential}
                    </p>
                    <p className="text-xs text-green-600">Differential</p>
                  </div>
                </div>
                <p className="text-xs text-center text-green-600 mt-1">
                  Net = Gross ({grossScore}) − Course HCP ({courseHandicap})
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. played with Bob and Jim on a sunny day..."
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attestation reminder */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">After submitting:</p>
              <p>
                Show your QR code to 1 playing partner. They'll scan it and
                attest your score. You need their attestation before your round
                counts.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="green"
          size="lg"
          className="w-full"
          disabled={submitting || !season}
        >
          {submitting ? 'Submitting...' : 'Submit Round'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </div>
  )
}
