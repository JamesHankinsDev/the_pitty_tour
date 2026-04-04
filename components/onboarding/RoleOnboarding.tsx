'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/elections/RoleBadge'
import {
  Crown,
  BookOpen,
  Scale,
  Shield,
  Target,
  CheckCircle2,
  ChevronRight,
  X,
  Megaphone,
  Flag,
  DollarSign,
  Users,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

const STORAGE_KEY = 'pity_role_onboarded'

interface RoleGuide {
  officeKey: string
  officeTitle: string
  icon: React.ElementType
  color: string
  congratsLine: string
  description: string
  responsibilities: string[]
  appFeatures: { label: string; link: string; icon: React.ElementType }[]
  firstStep: string
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    officeKey: 'commissioner',
    officeTitle: 'Commissioner',
    icon: Crown,
    color: 'bg-yellow-100 text-yellow-700',
    congratsLine: 'You are the face of the PITY Tour.',
    description:
      'As Commissioner, you make final calls on escalated rules disputes, set the season calendar, and represent the Tour publicly.',
    responsibilities: [
      'Set and approve the season schedule',
      'Resolve escalated rules disputes',
      'Post official league announcements',
      'Represent the Tour at events and communications',
    ],
    appFeatures: [
      { label: 'Post Announcements', link: '/dashboard/announcements', icon: Megaphone },
      { label: 'View Players', link: '/dashboard/players', icon: Users },
    ],
    firstStep: 'Head to Announcements and post a welcome message to the Tour.',
  },
  {
    officeKey: 'secretary',
    officeTitle: 'Secretary',
    icon: BookOpen,
    color: 'bg-purple-100 text-purple-700',
    congratsLine: 'You keep the Tour running smoothly.',
    description:
      'As Secretary, you handle official league communications, manage the announcement board, and keep records of Tour decisions.',
    responsibilities: [
      'Post and manage league announcements',
      'Handle official Tour communications',
      'Keep meeting minutes and Tour records',
      'Coordinate with Commissioner on messaging',
    ],
    appFeatures: [
      { label: 'Post Announcements', link: '/dashboard/announcements', icon: Megaphone },
    ],
    firstStep: 'Check the Announcements page and post any upcoming event details.',
  },
  {
    officeKey: 'treasurer',
    officeTitle: 'Treasurer',
    icon: Scale,
    color: 'bg-blue-100 text-blue-700',
    congratsLine: 'You guard the Tour\'s finances.',
    description:
      'As Treasurer, you track dues collection, forfeit payments, and prize pool balances. You coordinate end-of-season payouts.',
    responsibilities: [
      'Monitor monthly dues collection status',
      'Track forfeits and their impact on prize pools',
      'Review season purse allocation',
      'Coordinate payouts with the Commissioner',
    ],
    appFeatures: [
      { label: 'Treasurer Dashboard', link: '/dashboard/treasurer', icon: DollarSign },
    ],
    firstStep: 'Open the Treasurer Dashboard to review the current season\'s financial status.',
  },
  {
    officeKey: 'master_at_arms',
    officeTitle: 'Master at Arms',
    icon: Shield,
    color: 'bg-red-100 text-red-700',
    congratsLine: 'You protect the integrity of the Tour.',
    description:
      'As Master at Arms, you investigate score disputes, review flagged attestations, and issue rulings on rules questions.',
    responsibilities: [
      'Review rounds flagged for potential issues',
      'Investigate score disputes and attestation questions',
      'Issue rulings in coordination with the Handicap Chair',
      'Maintain fairness and competitive integrity',
    ],
    appFeatures: [
      { label: 'Flag Rounds for Review', link: '/dashboard/attest', icon: Flag },
    ],
    firstStep: 'When attesting rounds, you\'ll now see a "Flag for review" option on any round that looks suspicious.',
  },
  {
    officeKey: 'handicap_chair',
    officeTitle: 'Handicap Chair',
    icon: Target,
    color: 'bg-green-100 text-green-700',
    congratsLine: 'You ensure fair play through accurate handicaps.',
    description:
      'As Handicap Chair, you oversee handicap integrity, review scoring trends, and certify handicaps before major events.',
    responsibilities: [
      'Monitor player scoring trends for anomalies',
      'Review handicap history across all players',
      'Flag potential sandbagging to Master at Arms',
      'Certify handicaps before the Tour Championship',
    ],
    appFeatures: [
      { label: 'Handicap Review', link: '/dashboard/handicap-review', icon: BarChart3 },
    ],
    firstStep: 'Open the Handicap Review page to familiarize yourself with all players\' scoring history.',
  },
]

export function RoleOnboarding() {
  const { profile } = useAuth()
  const [activeGuide, setActiveGuide] = useState<RoleGuide | null>(null)
  const [step, setStep] = useState(0) // 0 = congrats, 1 = responsibilities, 2 = app features

  useEffect(() => {
    if (!profile?.roles || profile.roles.length === 0) return

    const onboardedRaw = localStorage.getItem(STORAGE_KEY)
    const onboarded: string[] = onboardedRaw ? JSON.parse(onboardedRaw) : []

    // Find the first role that hasn't been onboarded yet
    for (const role of profile.roles) {
      if (!onboarded.includes(role)) {
        const guide = ROLE_GUIDES.find((g) => g.officeKey === role)
        if (guide) {
          // Small delay to not compete with page load
          const timer = setTimeout(() => setActiveGuide(guide), 1000)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [profile?.roles])

  const handleComplete = () => {
    if (!activeGuide) return
    const onboardedRaw = localStorage.getItem(STORAGE_KEY)
    const onboarded: string[] = onboardedRaw ? JSON.parse(onboardedRaw) : []
    onboarded.push(activeGuide.officeKey)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(onboarded))
    setActiveGuide(null)
    setStep(0)
  }

  if (!activeGuide) return null

  const Icon = activeGuide.icon
  const totalSteps = 3

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleComplete} />

      {/* Card */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-muted">
          <div
            className="h-1 bg-green-500 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step 0: Congratulations */}
        {step === 0 && (
          <div className="p-6 pt-8 text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${activeGuide.color}`}>
              <Icon className="w-10 h-10" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Congratulations!</p>
            <h2 className="text-2xl font-black mb-2">
              You&apos;re the new {activeGuide.officeTitle}
            </h2>
            <RoleBadge officeKey={activeGuide.officeKey} size="md" />
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              {activeGuide.congratsLine}
            </p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {activeGuide.description}
            </p>
          </div>
        )}

        {/* Step 1: Responsibilities */}
        {step === 1 && (
          <div className="p-6 pt-8">
            <h2 className="text-lg font-bold mb-1">Your Responsibilities</h2>
            <p className="text-sm text-muted-foreground mb-4">
              As {activeGuide.officeTitle}, here&apos;s what the Tour counts on you for:
            </p>
            <div className="space-y-2.5">
              {activeGuide.responsibilities.map((r, i) => (
                <div key={i} className="flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: App features + first step */}
        {step === 2 && (
          <div className="p-6 pt-8">
            <h2 className="text-lg font-bold mb-1">Your New Tools</h2>
            <p className="text-sm text-muted-foreground mb-4">
              These features are now unlocked for you:
            </p>
            <div className="space-y-2 mb-6">
              {activeGuide.appFeatures.map((f) => {
                const FIcon = f.icon
                return (
                  <div key={f.link} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <FIcon className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-sm font-medium flex-1">{f.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )
              })}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 mb-1">Your first step:</p>
              <p className="text-sm text-blue-700">{activeGuide.firstStep}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t">
          {step === 0 ? (
            <span className="text-xs text-muted-foreground">1 of {totalSteps}</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}

          {step < totalSteps - 1 ? (
            <Button variant="green" size="sm" onClick={() => setStep(step + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="green" size="sm" onClick={handleComplete}>
              Got it, let&apos;s go!
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
