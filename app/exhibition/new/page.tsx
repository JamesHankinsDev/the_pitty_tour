'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  createExhibitionSession,
  joinExhibitionSession,
  updateCachedCourse,
} from '@/lib/firebase/firestore'
import dynamic from 'next/dynamic'
const CourseSearchInput = dynamic(() => import('@/components/exhibition/CourseSearchInput').then((m) => m.CourseSearchInput), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded-md" />,
})
import { CARD_DEFINITIONS } from '@/lib/cards'
import { generateInviteCode } from '@/lib/utils/exhibition'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Users,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import type { CachedCourse, CachedCourseTee, ExhibitionFormat, ExhibitionTeam } from '@/lib/types'


const TEAM_COLORS = ['#16a34a', '#2563eb', '#dc2626', '#eab308', '#a855f7', '#ec4899']

const FORMAT_DESCRIPTIONS: Record<ExhibitionFormat, string> = {
  stroke_play: 'Lowest total score wins. Simple and classic.',
  skins: 'Lowest score on each hole wins a skin. Ties carry over.',
  match_play: 'Head-to-head hole-by-hole. Winner of each hole wins the hole.',
  stableford: 'Points per hole based on score vs. par. Highest total wins.',
  shamble: 'Team plays best tee shot, then everyone plays their own ball in.',
  scramble: 'Everyone plays their best shot every shot. One team score per hole.',
  vegas: 'Two-person team scores combined into a 2-digit number (lower + higher).',
}

export default function NewExhibitionPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — Course
  const [course, setCourse] = useState<CachedCourse | null>(null)
  const [selectedTee, setSelectedTee] = useState<CachedCourseTee | null>(null)
  const [holes, setHoles] = useState<9 | 18>(18)
  const [startingHole, setStartingHole] = useState(1)

  // Stroke index warnings & inline edits (for step 1)
  const [strokeIndexEdits, setStrokeIndexEdits] = useState<Record<number, number>>({})

  // Step 2 — Game settings
  const [format, setFormat] = useState<ExhibitionFormat>('stroke_play')
  const [scoringMode, setScoringMode] = useState<'gross' | 'net'>('net')
  const [teamMode, setTeamMode] = useState(false)
  const [teamA, setTeamA] = useState({ name: 'Team A', color: TEAM_COLORS[0] })
  const [teamB, setTeamB] = useState({ name: 'Team B', color: TEAM_COLORS[1] })
  const [soloPlay, setSoloPlay] = useState(false)
  const [useCards, setUseCards] = useState(false)
  const [nsfwCards, setNsfwCards] = useState(false)
  const [activeCards, setActiveCards] = useState<Set<string>>(
    new Set(CARD_DEFINITIONS.filter((c) => !c.isNsfw).map((c) => c.key))
  )

  const handleTeeSelect = (teeName: string) => {
    const tee = course?.tees.find((t) => t.name === teeName) ?? null
    setSelectedTee(tee)
  }

  // Holes missing stroke index (for warnings)
  const holesMissingIdx = course
    ? course.holes.slice(0, holes).filter((h) => !h.strokeIndex || h.strokeIndex < 1 || h.strokeIndex > holes)
    : []

  const canAdvanceFromStep1 =
    course && selectedTee && (holesMissingIdx.length === 0 || Object.keys(strokeIndexEdits).length >= holesMissingIdx.length)

  const handleSaveStrokeIndexEdits = async () => {
    if (!course) return
    // Merge edits into the cached course
    const updatedHoles = course.holes.map((h) => ({
      ...h,
      strokeIndex: strokeIndexEdits[h.number] ?? h.strokeIndex,
    }))
    await updateCachedCourse(course.id, { holes: updatedHoles })
    setCourse({ ...course, holes: updatedHoles })
    toast.success('Stroke indexes saved')
    setStrokeIndexEdits({})
  }

  const toggleCard = (key: string) => {
    setActiveCards((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAllCards = () => {
    const keys = CARD_DEFINITIONS
      .filter((c) => nsfwCards || !c.isNsfw)
      .map((c) => c.key)
    setActiveCards(new Set(keys))
  }

  const deselectAllCards = () => {
    setActiveCards(new Set())
  }

  const handleCreate = async () => {
    if (!user || !profile || !course || !selectedTee) return
    setSubmitting(true)
    try {
      const inviteCode = generateInviteCode()
      const teams: ExhibitionTeam[] | null = teamMode
        ? [
            { id: 'A', name: teamA.name, color: teamA.color, memberIds: [] },
            { id: 'B', name: teamB.name, color: teamB.color, memberIds: [] },
          ]
        : null

      const sessionId = await createExhibitionSession({
        status: 'lobby',
        hostId: user.uid,
        courseId: course.id,
        courseName: course.courseName,
        holes,
        startingHole,
        format,
        scoringMode,
        teamMode,
        teams,
        soloPlay,
        useCards: soloPlay ? false : useCards,
        activeCards: soloPlay ? [] : useCards ? Array.from(activeCards) : [],
        nsfwCards: soloPlay ? false : nsfwCards,
        inviteCode,
        teeName: selectedTee.name,
        slope: selectedTee.slope,
        courseRating: selectedTee.rating,
        par: course.par,
      })

      // Auto-join the host
      await joinExhibitionSession(sessionId, {
        userId: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        isBot: false,
        handicapIndex: profile.handicapIndex,
        courseHandicap: 0, // computed at round start
        teamId: null,
        status: 'joined',
        drinksConsumed: 0,
        cardInventory: [],
        pendingCards: [],
        scores: {},
      })

      toast.success('Session created!')
      router.push(`/exhibition/${sessionId}/lobby`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
        <Link href="/exhibition" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Exhibition
        </Link>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            New Exhibition Round
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Step {step} of 3 &middot; {step === 1 ? 'Course' : step === 2 ? 'Game Settings' : 'Players'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex-1 h-1 rounded-full ${n <= step ? 'bg-purple-600' : 'bg-muted'}`}
            />
          ))}
        </div>

        {/* ── Step 1: Course ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select Course</CardTitle>
                <CardDescription>Search for a course to play</CardDescription>
              </CardHeader>
              <CardContent>
                <CourseSearchInput
                  selectedCourse={course}
                  onCourseSelected={(c) => {
                    setCourse(c)
                    setSelectedTee(c.tees[0] ?? null)
                  }}
                />
              </CardContent>
            </Card>

            {course && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tees</CardTitle>
                    <CardDescription>Lock slope and rating for this round</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {course.tees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tee data available for this course.</p>
                    ) : (
                      <Select value={selectedTee?.name ?? ''} onValueChange={handleTeeSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tees..." />
                        </SelectTrigger>
                        <SelectContent>
                          {course.tees.map((t) => (
                            <SelectItem key={`${t.gender}-${t.name}`} value={t.name}>
                              {t.name} ({t.gender === 'female' ? 'W' : 'M'}) &middot; {t.rating}/{t.slope}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Round Length</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex rounded-lg border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setHoles(18)}
                        className={`flex-1 py-2.5 text-sm font-semibold ${holes === 18 ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
                      >
                        18 Holes
                      </button>
                      <button
                        type="button"
                        onClick={() => setHoles(9)}
                        className={`flex-1 py-2.5 text-sm font-semibold ${holes === 9 ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
                      >
                        9 Holes
                      </button>
                    </div>

                    {holes === 9 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Starting Hole</Label>
                        <Select value={String(startingHole)} onValueChange={(v) => setStartingHole(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Front 9 (holes 1-9)</SelectItem>
                            <SelectItem value="10">Back 9 (holes 10-18)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {holesMissingIdx.length > 0 && (
                  <Card className="border-yellow-300 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="w-4 h-4" />
                        Missing Stroke Indexes
                      </CardTitle>
                      <CardDescription className="text-yellow-700">
                        {holesMissingIdx.length} hole{holesMissingIdx.length !== 1 ? 's' : ''} need a stroke index (1-{holes}).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {holesMissingIdx.map((h) => (
                        <div key={h.number} className="flex items-center gap-2">
                          <Label className="text-xs w-16">Hole {h.number}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={holes}
                            value={strokeIndexEdits[h.number] ?? ''}
                            onChange={(e) =>
                              setStrokeIndexEdits({
                                ...strokeIndexEdits,
                                [h.number]: Number(e.target.value),
                              })
                            }
                            placeholder="1-18"
                            className="text-sm h-8"
                          />
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveStrokeIndexEdits}
                        disabled={Object.keys(strokeIndexEdits).length < holesMissingIdx.length}
                      >
                        Save Stroke Indexes
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="flex justify-end">
              <Button
                variant="green"
                onClick={() => setStep(2)}
                disabled={!canAdvanceFromStep1}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Game Settings ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={format} onValueChange={(v) => setFormat(v as ExhibitionFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stroke_play">Stroke Play</SelectItem>
                    <SelectItem value="skins">Skins</SelectItem>
                    <SelectItem value="match_play">Match Play</SelectItem>
                    <SelectItem value="stableford">Stableford</SelectItem>
                    <SelectItem value="shamble">Shamble</SelectItem>
                    <SelectItem value="scramble">Scramble</SelectItem>
                    <SelectItem value="vegas">Vegas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{FORMAT_DESCRIPTIONS[format]}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setScoringMode('gross')}
                    className={`flex-1 py-2.5 text-sm font-semibold ${scoringMode === 'gross' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    Gross
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode('net')}
                    className={`flex-1 py-2.5 text-sm font-semibold ${scoringMode === 'net' ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    Net (Handicap)
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Solo Play
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input type="checkbox" checked={soloPlay} onChange={(e) => { setSoloPlay(e.target.checked); if (e.target.checked) { setTeamMode(false); setUseCards(false) } }} className="sr-only peer" />
                    <div className="w-10 h-5 bg-muted peer-checked:bg-purple-600 rounded-full relative transition-colors">
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${soloPlay ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                </CardTitle>
                <CardDescription>
                  Play against a golf bot matched to your handicap. No invite code needed.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className={soloPlay ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Teams
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input type="checkbox" checked={teamMode} onChange={(e) => setTeamMode(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-muted peer-checked:bg-purple-600 rounded-full relative transition-colors">
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${teamMode ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                </CardTitle>
              </CardHeader>
              {teamMode && (
                <CardContent className="space-y-3">
                  {[
                    { team: teamA, set: setTeamA, label: 'Team A' },
                    { team: teamB, set: setTeamB, label: 'Team B' },
                  ].map(({ team, set, label }) => (
                    <div key={label} className="flex gap-2 items-center">
                      <div className="flex gap-1">
                        {TEAM_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => set({ ...team, color: c })}
                            className={`w-6 h-6 rounded-full border-2 ${team.color === c ? 'border-foreground' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <Input
                        value={team.name}
                        onChange={(e) => set({ ...team, name: e.target.value })}
                        className="flex-1 text-sm"
                        placeholder={label}
                      />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            <Card className={soloPlay ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Cards
                  <label className="relative inline-flex items-center cursor-pointer ml-auto">
                    <input type="checkbox" checked={useCards} onChange={(e) => setUseCards(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-muted peer-checked:bg-purple-600 rounded-full relative transition-colors">
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useCards ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                </CardTitle>
                <CardDescription>Mario Kart-style power-ups and penalties</CardDescription>
              </CardHeader>
              {useCards && (
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">NSFW Cards</Label>
                      <p className="text-xs text-muted-foreground">Enable adult-themed cards</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={nsfwCards} onChange={(e) => setNsfwCards(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-muted peer-checked:bg-red-600 rounded-full relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${nsfwCards ? 'translate-x-5' : ''}`} />
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllCards}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={deselectAllCards}>Deselect All</Button>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {CARD_DEFINITIONS.map((card) => {
                      const disabled = card.isNsfw && !nsfwCards
                      const checked = activeCards.has(card.key)
                      return (
                        <label
                          key={card.key}
                          className={`flex items-start gap-2 p-2 rounded-lg border ${disabled ? 'opacity-40' : 'hover:bg-accent cursor-pointer'} ${checked ? 'border-purple-300 bg-purple-50' : 'border-transparent'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked && !disabled}
                            disabled={disabled}
                            onChange={() => toggleCard(card.key)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold">{card.name}</p>
                              {card.isNsfw && <Badge variant="destructive" className="text-xs">NSFW</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="green" onClick={() => setStep(3)}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Players / Review ────────────────────────────────── */}
        {step === 3 && course && selectedTee && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Review</CardTitle>
                <CardDescription>Confirm your session details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{course.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tees</span>
                  <span className="font-medium">{selectedTee.name} ({selectedTee.rating}/{selectedTee.slope})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Holes</span>
                  <span className="font-medium">{holes}{holes === 9 ? ` (starting ${startingHole})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium capitalize">{format.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scoring</span>
                  <span className="font-medium capitalize">{scoringMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">{soloPlay ? 'Solo Play (vs Bot)' : teamMode ? `${teamA.name} vs ${teamB.name}` : 'Individual'}</span>
                </div>
                {!soloPlay && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cards</span>
                    <span className="font-medium">{useCards ? `${activeCards.size} active${nsfwCards ? ' (NSFW)' : ''}` : 'Off'}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-purple-800 font-medium mb-1">After creating, share the invite code:</p>
                <p className="text-xs text-purple-700">
                  Players can join from <span className="font-mono">/exhibition/join/[code]</span>
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="green"
                onClick={handleCreate}
                disabled={submitting}
              >
                <Check className="w-4 h-4 mr-1" />
                {submitting ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
