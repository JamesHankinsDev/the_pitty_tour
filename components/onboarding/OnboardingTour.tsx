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
    title: 'Play Golf',
    subtitle: 'Submit scores, get attested, and compete',
    features: [
      {
        icon: Flag,
        color: 'bg-green-100 text-green-700',
        title: 'Submit Rounds',
        description: 'Log 18-hole rounds for monthly events or 9-hole rounds for practice.',
      },
      {
        icon: ScanLine,
        color: 'bg-blue-100 text-blue-700',
        title: 'QR Attestation',
        description: 'A playing partner scans your QR code to verify your score.',
      },
      {
        icon: Trophy,
        color: 'bg-yellow-100 text-yellow-700',
        title: 'Select for Scoring',
        description: 'Pick which of your valid rounds counts for the monthly leaderboard.',
      },
      {
        icon: Calendar,
        color: 'bg-blue-100 text-blue-700',
        title: 'Schedule Rounds',
        description: 'Post a tee time and course — other players can join with one tap.',
      },
    ],
  },
  {
    title: 'Compete & Earn',
    subtitle: 'Track standings, earn payouts, and unlock badges',
    features: [
      {
        icon: BarChart3,
        color: 'bg-yellow-100 text-yellow-700',
        title: 'Leaderboard',
        description: 'Gross and net standings update in real time throughout the month.',
      },
      {
        icon: DollarSign,
        color: 'bg-green-100 text-green-700',
        title: 'Prize Payouts',
        description: 'Top 3 Net, Top 2 Gross, and skill bonuses for saves and par-3 pars.',
      },
      {
        icon: Medal,
        color: 'bg-purple-100 text-purple-700',
        title: 'Achievements',
        description: '26 badges across bronze, silver, gold, and platinum tiers.',
      },
      {
        icon: Award,
        color: 'bg-yellow-100 text-yellow-700',
        title: 'Highlights',
        description: 'Season records, monthly champions, and personal bests.',
      },
    ],
  },
  {
    title: 'Community',
    subtitle: 'Connect with Tour members and stay informed',
    features: [
      {
        icon: MessageSquare,
        color: 'bg-blue-100 text-blue-700',
        title: 'Tour Board',
        description: 'Chat, find a partner with LFG, and stay connected with the Tour.',
      },
      {
        icon: Vote,
        color: 'bg-purple-100 text-purple-700',
        title: 'Polls & Elections',
        description: 'Vote on course choices, format ideas, and Tour officer elections.',
      },
      {
        icon: Megaphone,
        color: 'bg-yellow-100 text-yellow-700',
        title: 'Announcements',
        description: 'Official updates from the Commissioner\'s Office.',
      },
      {
        icon: Bell,
        color: 'bg-red-100 text-red-700',
        title: 'Notifications',
        description: 'In-app bell and push alerts for rounds, attestations, and LFG.',
      },
    ],
  },
  {
    title: 'Your Profile',
    subtitle: 'Track your progress and passport',
    features: [
      {
        icon: Stamp,
        color: 'bg-orange-100 text-orange-700',
        title: 'Marker Passport',
        description: 'Play with 4+ unique markers for bonus points. Track your progress.',
      },
      {
        icon: TrendingDown,
        color: 'bg-green-100 text-green-700',
        title: 'Handicap Trend',
        description: 'Chart your handicap changes over the season on your Profile page.',
      },
      {
        icon: MapPin,
        color: 'bg-red-100 text-red-700',
        title: 'Course Directory',
        description: 'Browse courses with green fees, ratings, reviews, and booking links.',
      },
      {
        icon: QrCode,
        color: 'bg-purple-100 text-purple-700',
        title: 'Your QR Code',
        description: 'Share with playing partners so they can attest your rounds.',
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

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleComplete} />

      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground z-10"
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
                Tap any feature to learn more — or just dive in!
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
