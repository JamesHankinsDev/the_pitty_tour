'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Flag,
  ScanLine,
  BarChart3,
  DollarSign,
  QrCode,
  MessageSquare,
  Trophy,
  ChevronRight,
  ChevronLeft,
  X,
  Stamp,
  Medal,
  MapPin,
  Calendar,
  Users,
  Award,
  Vote,
  Megaphone,
  Bell,
  TrendingDown,
} from 'lucide-react'

const STORAGE_KEY = 'pity_onboarding_complete'

interface TourStep {
  icon: React.ElementType
  color: string
  title: string
  description: string
}

const steps: TourStep[] = [
  {
    icon: Flag,
    color: 'bg-green-100 text-green-700',
    title: 'Submit Your Round',
    description:
      'After playing 18 holes, submit your score with course details. You can also log 9-hole practice rounds for handicap tracking.',
  },
  {
    icon: ScanLine,
    color: 'bg-blue-100 text-blue-700',
    title: 'Get Attested',
    description:
      'Show your QR code to a playing partner. They scan it to verify your score. You need 1 attestation for a round to count.',
  },
  {
    icon: QrCode,
    color: 'bg-purple-100 text-purple-700',
    title: 'Your QR Code',
    description:
      'Find your personal QR code under "My QR Code." Share it with playing partners so they can attest your rounds.',
  },
  {
    icon: BarChart3,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'Track the Leaderboard',
    description:
      'The leaderboard shows unofficial standings during the month based on everyone\'s best round. It becomes official when the month closes.',
  },
  {
    icon: DollarSign,
    color: 'bg-green-100 text-green-700',
    title: 'Earn Payouts',
    description:
      'Each month, 60% of dues go to the performance purse — Top 3 Net, Top 2 Gross, and Skill Bonuses for sand saves and par-3 pars.',
  },
  {
    icon: Trophy,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'Select Your Scoring Round',
    description:
      'If you play multiple rounds in a month, go to "My Rounds" and select the one you want to count for monthly scoring.',
  },
  {
    icon: Stamp,
    color: 'bg-orange-100 text-orange-700',
    title: 'Marker Passport',
    description:
      'Play with different Tour members throughout the season. You need at least 4 unique markers, and each earns you 5 bonus points.',
  },
  {
    icon: MessageSquare,
    color: 'bg-blue-100 text-blue-700',
    title: 'Tour Board & LFG',
    description:
      'Chat with the Tour on the Tour Board. Toggle "Looking for Partner" when you need someone to play with — everyone gets notified.',
  },
  {
    icon: MapPin,
    color: 'bg-red-100 text-red-700',
    title: 'Course Directory',
    description:
      'Browse and add courses with green fees, ratings, and booking links. Leave reviews to help fellow Tour members find great tracks.',
  },
  {
    icon: Medal,
    color: 'bg-purple-100 text-purple-700',
    title: 'Unlock Achievements',
    description:
      'Earn badges for milestones — your first round, breaking 80, 10 sand saves, playing 5 different courses, and more. Check your progress anytime.',
  },
  {
    icon: Calendar,
    color: 'bg-blue-100 text-blue-700',
    title: 'Calendar & Scheduling',
    description:
      'View the Tour calendar with scoring deadlines and season events. Schedule rounds with a course, date, and tee time — other players can join with one tap.',
  },
  {
    icon: Users,
    color: 'bg-green-100 text-green-700',
    title: 'Tour Players',
    description:
      'Browse the player directory to see all Tour members and their handicaps. Spot who\'s looking for a partner with the LFG badge.',
  },
  {
    icon: Award,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'Season Highlights',
    description:
      'Check out season records — lowest gross, best differential, most sand saves, monthly champions, and more. Updated in real time as rounds come in.',
  },
  {
    icon: TrendingDown,
    color: 'bg-green-100 text-green-700',
    title: 'Handicap Trend',
    description:
      'Your Profile page includes a handicap trend chart that tracks changes over the season from GHIN syncs and manual updates.',
  },
  {
    icon: Vote,
    color: 'bg-purple-100 text-purple-700',
    title: 'Polls & Elections',
    description:
      'Vote on community polls for course choices and format ideas. Participate in officer elections — volunteer to run or vote for your preferred candidate.',
  },
  {
    icon: Megaphone,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'Announcements',
    description:
      'Official Tour updates from the Commissioner\'s Office appear on your dashboard and the Announcements page. Stay in the loop on schedule changes, rules, and events.',
  },
  {
    icon: Bell,
    color: 'bg-red-100 text-red-700',
    title: 'Notifications',
    description:
      'The bell icon in the top nav shows new round submissions, attestations, LFG requests, and more. Enable push notifications to get alerts on your phone too.',
  },
]

export function OnboardingTour() {
  const { user, isDemo } = useAuth()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!user && !isDemo) return
    // Check if onboarding was already completed
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      // Delay so the dashboard loads first
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [user, isDemo])

  const handleComplete = () => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!show) return null

  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1
  const isFirst = step === 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Card */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-green-500 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8 text-center">
          {/* Step counter */}
          <p className="text-xs text-muted-foreground mb-4">
            {step + 1} of {steps.length}
          </p>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${current.color}`}>
            <Icon className="w-8 h-8" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold mb-2">{current.title}</h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t">
          {isFirst ? (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tour
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {/* Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-green-600 w-4' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Button variant="green" size="sm" onClick={handleComplete}>
              Let's Go!
            </Button>
          ) : (
            <Button variant="green" size="sm" onClick={() => setStep(step + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Reset the onboarding tour so it shows again.
 * Can be called from profile/settings.
 */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}
