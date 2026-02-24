'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Flag, Trophy, QrCode, BarChart3, Shield, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

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
        'Every round needs 2 playing partners to attest via QR scan. No sandbagging.',
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

          {/* Invite-only notice */}
          {!loading && (
            <div className="inline-flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-green-100">
                <Lock className="w-5 h-5 text-green-300 shrink-0" />
                <span className="text-sm font-medium text-left">
                  Membership is by invitation only.
                  <br />
                  Use your personal invite link to join.
                </span>
              </div>
              <p className="text-xs text-green-400">
                Already a member?{' '}
                <a href="/dashboard" className="underline underline-offset-2 hover:text-green-200">
                  Go to your dashboard
                </a>
              </p>
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
