'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Flag,
  ScanLine,
  BarChart3,
  MessageSquare,
  Trophy,
  ChevronRight,
  X,
  Medal,
  Calendar,
  Users,
  Award,
  Vote,
  Megaphone,
  Bell,
  User,
  Sparkles,
  MessageSquarePlus,
} from 'lucide-react'

const STORAGE_KEY = 'pity_onboarding_complete'

interface Feature {
  icon: React.ElementType
  color: string
  title: string
  description: string
}

interface FeatureGroup {
  title: string
  subtitle: string
  features: Feature[]
}

const groups: FeatureGroup[] = [
  {
    title: 'Play',
    subtitle: 'Submit scores, get attested, and compete',
    features: [
      {
        icon: Flag,
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
        title: 'Submit Rounds',
        description: 'Log 18-hole rounds for events or 9-hole rounds for practice. Sand saves and par-3 pars are tracked for skill bonuses.',
      },
      {
        icon: ScanLine,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
        title: 'Attest & QR',
        description: 'A partner scans your QR code to verify your score. Find your QR on your Profile page.',
      },
      {
        icon: Trophy,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
        title: 'My Rounds',
        description: 'View all your rounds, select which one counts for monthly scoring, and track attestation status.',
      },
      {
        icon: Sparkles,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400',
        title: 'Exhibition',
        description: 'Casual fun-mode games with friends — skins, match play, stableford, team formats, plus Mario Kart-style cards. Doesn\u2019t affect tour standings.',
      },
    ],
  },
  {
    title: 'Tour',
    subtitle: 'Standings, payouts, players, and courses',
    features: [
      {
        icon: BarChart3,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
        title: 'Leaderboard & Payouts',
        description: 'Gross and net standings update live. Top 3 Net, Top 2 Gross, and skill bonuses paid monthly.',
      },
      {
        icon: Users,
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
        title: 'Players & Courses',
        description: 'Browse Tour members and their handicaps. Find courses with green fees, ratings, reviews, and booking links.',
      },
      {
        icon: Calendar,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
        title: 'Calendar',
        description: 'View scoring deadlines, schedule rounds with a tee time, and invite others to join.',
      },
      {
        icon: Award,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
        title: 'Highlights',
        description: 'Season records, monthly champions, best differentials, and streak tracking.',
      },
    ],
  },
  {
    title: 'Community',
    subtitle: 'Chat, vote, and stay in the loop',
    features: [
      {
        icon: Megaphone,
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
        title: 'Tour Info',
        description: 'Official announcements and the officer directory — all in one place.',
      },
      {
        icon: MessageSquare,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
        title: 'Tour Board',
        description: 'Chat with the Tour and toggle "Looking for Partner" to find someone to play with.',
      },
      {
        icon: Vote,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400',
        title: 'Polls & Elections',
        description: 'Vote on course choices, format ideas, and Tour officer elections.',
      },
    ],
  },
  {
    title: 'Me',
    subtitle: 'Your progress, profile, and notifications',
    features: [
      {
        icon: Medal,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400',
        title: 'My Progress',
        description: 'Track your badges (26 achievements!) and marker passport with bonus points for unique playing partners.',
      },
      {
        icon: User,
        color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
        title: 'Profile',
        description: 'Edit your info, view your QR code, and see your handicap trend chart over the season.',
      },
      {
        icon: Bell,
        color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
        title: 'Notifications',
        description: 'The bell icon shows round submissions, attestations, and LFG alerts. Enable push for phone notifications.',
      },
      {
        icon: MessageSquarePlus,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
        title: 'Feedback',
        description: 'Report a bug, suggest an idea, or ask a question. Submissions go straight to the developer and you\u2019ll see replies here.',
      },
    ],
  },
]

export function OnboardingTour() {
  const { user, isDemo } = useAuth()
  const [show, setShow] = useState(false)
  const [page, setPage] = useState<'welcome' | 'features'>('welcome')

  useEffect(() => {
    if (!user && !isDemo) return
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const timer = setTimeout(() => setShow(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [user, isDemo])

  const handleComplete = () => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  // Dismiss on Escape key
  useEffect(() => {
    if (!show) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') handleComplete() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleComplete} aria-hidden="true" />

      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground z-10"
          aria-label="Close tutorial"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Welcome page */}
        {page === 'welcome' && (
          <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white font-black text-3xl">P</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Welcome to the PITY Tour</h1>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Here&apos;s a quick look at everything you can do. You can always replay this from your Profile.
            </p>
            <Button variant="green" size="lg" onClick={() => setPage('features')} className="group">
              Show Me Around
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <button
              onClick={handleComplete}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            >
              Skip — I&apos;ll explore on my own
            </button>
          </div>
        )}

        {/* Features page */}
        {page === 'features' && (
          <>
            <div className="p-5 pb-3 border-b shrink-0">
              <h2 className="text-lg font-bold">What You Can Do</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                A quick tour of everything inside — dive in when you&apos;re ready!
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {groups.map((group) => (
                <div key={group.title}>
                  <div className="mb-2">
                    <h3 className="font-semibold text-sm">{group.title}</h3>
                    <p className="text-xs text-muted-foreground">{group.subtitle}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.features.map((feature) => {
                      const Icon = feature.icon
                      return (
                        <div
                          key={feature.title}
                          className="p-3 rounded-xl border hover:bg-accent/50 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${feature.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="font-medium text-xs mb-0.5">{feature.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t shrink-0">
              <Button variant="green" className="w-full" onClick={handleComplete}>
                Let&apos;s Play!
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY)
}
