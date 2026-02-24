'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Flag, Trophy, QrCode, BarChart3, Shield, Lock, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  const { user, signIn, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  const handleSignIn = async () => {
    try {
      await signIn()
      router.replace('/dashboard')
    } catch {
      toast.error('Sign in failed. Please try again.')
    }
  }

  const features = [
    {
      icon: Flag,
      title: 'Monthly Rounds',
      description:
        'Submit your scores each month. Best round counts toward standings.',
    },
    {
      icon: QrCode,
      title: 'QR Attestation',
      description:
        'Every round needs 1 playing partner to attest via QR scan. No sandbagging.',
    },
    {
      icon: BarChart3,
      title: 'Gross & Net',
      description:
        'Compete in two categories. Points awarded for both gross and handicap-adjusted net scores.',
    },
    {
      icon: Trophy,
      title: 'Prize Pool',
      description:
        'Monthly and season championship payouts. Forfeits go into the prize pool.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-800 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-700/50 rounded-full px-4 py-1.5 text-sm text-green-200 mb-6">
            <Shield className="w-4 h-4" />
            Players' Invitational Tour — Yearly
          </div>

          {/* Logo / Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-2xl mb-6">
              <span className="text-green-800 font-black text-4xl">P</span>
            </div>
            <h1 className="text-6xl font-black tracking-tight mb-3">
              PITY Tour
            </h1>
            <p className="text-xl text-green-200 font-light">
              The amateur golf league where every round counts.
            </p>
          </div>

          {/* CTA */}
          {!loading && (
            <div className="flex flex-col items-center gap-4">
              {/* Sign in for existing members */}
              <Button
                size="xl"
                className="bg-white text-green-800 hover:bg-green-50 font-bold shadow-xl group"
                onClick={handleSignIn}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign In with Google
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              {/* Invite-only notice for new visitors */}
              <div className="flex items-center gap-2 text-green-300 text-xs">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>New members must use a personal invite link to join.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white/5 backdrop-blur-sm py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-2xl font-bold text-white mb-10">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white/10 rounded-xl p-6 backdrop-blur-sm"
                >
                  <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-green-300" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-green-200 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Season Info */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm text-center">
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Season Overview</h2>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-3xl font-black text-yellow-400">Apr–Nov</p>
              <p className="text-green-200 text-sm mt-1">Season Months</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-400">$100</p>
              <p className="text-green-200 text-sm mt-1">Registration</p>
            </div>
            <div>
              <p className="text-3xl font-black text-yellow-400">$50/mo</p>
              <p className="text-green-200 text-sm mt-1">Monthly Dues</p>
            </div>
          </div>
          <p className="text-green-200 text-sm">
            Submit one valid, attested round per month. Miss a month and your
            $50 goes to the prize pool.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-green-400 text-sm">
        <p>© {new Date().getFullYear()} PITY Tour · All rights reserved</p>
      </footer>
    </div>
  )
}
