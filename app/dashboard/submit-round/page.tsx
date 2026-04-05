'use client'

import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import { submitRound, notifyAllPlayers, subscribeToCourses } from '@/lib/firebase/firestore'
import { sendPushToAll } from '@/lib/firebase/push'
import type { Course } from '@/lib/types'
import { searchCoursesApi, getAvailableTees, type ApiCourseResult, type TeeOption } from '@/lib/utils/courseSearch'
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
  MapPin,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

const schema18 = z.object({
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
  sandSaves: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(18, 'Max 18')
    .default(0),
  par3Pars: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(6, 'Max 6')
    .default(0),
  notes: z.string().max(300, 'Max 300 characters').optional(),
})

const schema9 = z.object({
  courseName: z.string().min(2, 'Course name required'),
  courseRating: z
    .number({ invalid_type_error: 'Enter course rating' })
    .min(27, 'Too low')
    .max(40, 'Too high'),
  slopeRating: z
    .number({ invalid_type_error: 'Enter slope rating' })
    .min(55, 'Min 55')
    .max(155, 'Max 155'),
  grossScore: z
    .number({ invalid_type_error: 'Enter gross score' })
    .min(27, 'Score too low')
    .max(100, 'Score too high'),
  sandSaves: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(9, 'Max 9')
    .default(0),
  par3Pars: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(3, 'Max 3')
    .default(0),
  notes: z.string().max(300, 'Max 300 characters').optional(),
})

type FormData = z.infer<typeof schema18>

export default function SubmitRoundPage() {
  const { profile, user } = useAuth()
  const { season } = useActiveSeason()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [holeCount, setHoleCount] = useState<9 | 18>(18)
  const [courses, setCourses] = useState<Course[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [showCourseSuggestions, setShowCourseSuggestions] = useState(false)
  const [apiResults, setApiResults] = useState<ApiCourseResult[]>([])
  const [searchingApi, setSearchingApi] = useState(false)
  const [teePickerCourse, setTeePickerCourse] = useState<ApiCourseResult | null>(null)
  // Shared tee-picker for local catalog courses too
  const [catalogTeePicker, setCatalogTeePicker] = useState<Course | null>(null)

  useEffect(() => {
    const unsub = subscribeToCourses(setCourses)
    return unsub
  }, [])

  // Debounced GolfCourseAPI search (with cache)
  useEffect(() => {
    if (courseSearch.length < 3 || !showCourseSuggestions) {
      setApiResults([])
      return
    }
    setSearchingApi(true)
    const timer = setTimeout(async () => {
      const results = await searchCoursesApi(courseSearch)
      setApiResults(results)
      setSearchingApi(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [courseSearch, showCourseSuggestions])

  const currentMonth = getCurrentMonthKey()
  const daysLeft = daysRemainingInMonth()

  const schema = holeCount === 9 ? schema9 : schema18

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      courseRating: holeCount === 9 ? 36.0 : 72.0,
      slopeRating: 113,
      grossScore: undefined,
      sandSaves: 0,
      par3Pars: 0,
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
        holeCount,
        courseName: data.courseName,
        courseRating: data.courseRating,
        slopeRating: data.slopeRating,
        grossScore: data.grossScore,
        netScore,
        differentialScore: differential,
        sandSaves: data.sandSaves,
        par3Pars: data.par3Pars,
        notes: data.notes ?? '',
      })
      setSubmitted(true)

      if (holeCount === 9) {
        toast.success('9-hole round logged! This counts toward your handicap but not monthly events.')
      } else {
        toast.success('Round submitted! Now get a partner to attest it.')
        // Only notify for 18-hole tour rounds
        const pushBody = `${profile.displayName} shot ${data.grossScore} at ${data.courseName}`
        notifyAllPlayers({
          type: 'round_submitted',
          title: 'New Round Submitted',
          body: pushBody,
          link: '/dashboard/leaderboard',
          actorUid: user.uid,
          actorName: profile.displayName,
          actorPhotoURL: profile.photoURL,
        }, user.uid).catch(() => {})
        sendPushToAll(user.uid, {
          title: 'New Round Submitted',
          body: pushBody,
          link: '/dashboard/leaderboard',
        })
      }
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
      {/* Catalog course tee picker */}
      {catalogTeePicker && catalogTeePicker.tees && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCatalogTeePicker(null)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-base">Which tees did you play?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{catalogTeePicker.name}</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {catalogTeePicker.tees.map((tee, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-0"
                  onClick={() => {
                    setValue('courseName', catalogTeePicker.name)
                    setValue('courseRating', tee.rating)
                    setValue('slopeRating', tee.slope)
                    setCourseSearch(catalogTeePicker.name)
                    toast.success(`Loaded ${catalogTeePicker.name} from ${tee.name} tees`)
                    setCatalogTeePicker(null)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{tee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tee.gender === 'female' ? "Women's" : "Men's"}
                        {tee.yards && ` · ${tee.yards} yds`}
                        {tee.par && ` · Par ${tee.par}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{tee.rating}/{tee.slope}</p>
                      <p className="text-xs text-muted-foreground">Rating/Slope</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setCatalogTeePicker(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tee picker modal */}
      {teePickerCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTeePickerCourse(null)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-base">Which tees did you play?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{teePickerCourse.name}</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {getAvailableTees(teePickerCourse).map((tee) => (
                <button
                  key={tee.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-0"
                  onClick={() => {
                    setValue('courseName', teePickerCourse.name)
                    setValue('courseRating', tee.rating)
                    setValue('slopeRating', tee.slope)
                    setCourseSearch(teePickerCourse.name)
                    toast.success(`Loaded ${teePickerCourse.name} from ${tee.name} tees`)
                    setTeePickerCourse(null)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{tee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tee.gender === 'female' ? "Women's" : "Men's"}
                        {tee.yards && ` · ${tee.yards} yds`}
                        {tee.par && ` · Par ${tee.par}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{tee.rating}/{tee.slope}</p>
                      <p className="text-xs text-muted-foreground">Rating/Slope</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setTeePickerCourse(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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
        {/* 9 / 18 Hole Toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            onClick={() => { setHoleCount(18); reset({ courseRating: 72.0, slopeRating: 113, grossScore: undefined as any, sandSaves: 0, par3Pars: 0 }) }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              holeCount === 18
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            18 Holes
            <span className="block text-xs font-normal mt-0.5 opacity-80">Tour Event</span>
          </button>
          <button
            type="button"
            onClick={() => { setHoleCount(9); reset({ courseRating: 36.0, slopeRating: 113, grossScore: undefined as any, sandSaves: 0, par3Pars: 0 }) }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              holeCount === 9
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            9 Holes
            <span className="block text-xs font-normal mt-0.5 opacity-80">Practice / Handicap</span>
          </button>
        </div>

        {holeCount === 9 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 flex gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                9-hole rounds count toward your handicap average but{' '}
                <strong>cannot be selected for monthly Tour event scoring</strong>.
                Attestation is optional.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Course Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="e.g. Augusta National"
                autoComplete="off"
                {...register('courseName', {
                  onChange: (e) => {
                    setCourseSearch(e.target.value)
                    setShowCourseSuggestions(e.target.value.length >= 2)
                  },
                })}
                onFocus={() => {
                  if (courseSearch.length >= 2) setShowCourseSuggestions(true)
                }}
                onBlur={() => {
                  // Delay so click on suggestion registers first
                  setTimeout(() => setShowCourseSuggestions(false), 200)
                }}
              />
              {/* Course suggestions — local catalog + GolfCourseAPI */}
              {showCourseSuggestions && (() => {
                const localMatches = courses.filter((c) =>
                  c.name.toLowerCase().includes(courseSearch.toLowerCase())
                ).slice(0, 5)
                const hasResults = localMatches.length > 0 || apiResults.length > 0 || searchingApi
                if (!hasResults && courseSearch.length < 3) return null
                return (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                    {localMatches.length > 0 && (
                      <>
                        <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">From Tour Catalog</p>
                        {localMatches.map((course) => (
                          <button
                            key={`local-${course.id}`}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-0"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setShowCourseSuggestions(false)
                              // If course has multiple tees, open picker
                              if (course.tees && course.tees.length > 1) {
                                setCatalogTeePicker(course)
                                return
                              }
                              // Otherwise use the primary rating/slope
                              setValue('courseName', course.name)
                              if (course.courseRating) setValue('courseRating', course.courseRating)
                              if (course.slopeRating) setValue('slopeRating', course.slopeRating)
                              setCourseSearch(course.name)
                              toast.success(`Loaded ${course.name}`)
                            }}
                          >
                            <p className="text-sm font-medium">{course.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {course.city}, {course.state}
                              {course.tees && course.tees.length > 0
                                ? ` · ${course.tees.length} tees`
                                : course.courseRating && course.slopeRating && ` · ${course.courseRating}/${course.slopeRating}`}
                            </p>
                          </button>
                        ))}
                      </>
                    )}

                    {apiResults.length > 0 && (
                      <>
                        <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">From GolfCourseAPI</p>
                        {apiResults.map((course) => {
                          const tees = getAvailableTees(course)
                          return (
                            <button
                              key={`api-${course.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-0"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setShowCourseSuggestions(false)
                                if (tees.length === 0) {
                                  // No tee data — just fill the name
                                  setValue('courseName', course.name)
                                  setCourseSearch(course.name)
                                  toast.info(`Loaded ${course.name} (no tee data available)`)
                                  return
                                }
                                if (tees.length === 1) {
                                  // One tee — use it directly
                                  const t = tees[0]
                                  setValue('courseName', course.name)
                                  setValue('courseRating', t.rating)
                                  setValue('slopeRating', t.slope)
                                  setCourseSearch(course.name)
                                  toast.success(`Loaded ${course.name} from ${t.name} tees`)
                                  return
                                }
                                // Multiple tees — open picker
                                setTeePickerCourse(course)
                              }}
                            >
                              <p className="text-sm font-medium">{course.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[course.city, course.state, course.country].filter(Boolean).join(', ')}
                                {tees.length > 0 && ` · ${tees.length} tee${tees.length !== 1 ? 's' : ''}`}
                              </p>
                            </button>
                          )
                        })}
                      </>
                    )}

                    {searchingApi && apiResults.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground italic">Searching GolfCourseAPI...</p>
                    )}

                    {!searchingApi && localMatches.length === 0 && apiResults.length === 0 && courseSearch.length >= 3 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground italic">No matches — enter course details manually below</p>
                    )}
                  </div>
                )
              })()}
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

        {/* Skill Bonuses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tour Book Skills</CardTitle>
            <CardDescription>
              Record sand saves and par-3 pars for skill bonus pools.
              Must be verified by your marker in the Tour Book.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sandSaves">Sand Saves</Label>
                <Input
                  id="sandSaves"
                  type="number"
                  min={0}
                  max={18}
                  placeholder="0"
                  {...register('sandSaves', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Bunker shot + par or better
                </p>
                {errors.sandSaves && (
                  <p className="text-xs text-destructive">
                    {errors.sandSaves.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="par3Pars">Par-3 Pars (or Better)</Label>
                <Input
                  id="par3Pars"
                  type="number"
                  min={0}
                  max={6}
                  placeholder="0"
                  {...register('par3Pars', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Par-3 holes at par or better
                </p>
                {errors.par3Pars && (
                  <p className="text-xs text-destructive">
                    {errors.par3Pars.message}
                  </p>
                )}
              </div>
            </div>
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
