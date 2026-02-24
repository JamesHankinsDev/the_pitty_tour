'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getInvite } from '@/lib/firebase/invites'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Invite } from '@/lib/types'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { differenceInDays, differenceInHours } from 'date-fns'

export const dynamic = 'force-dynamic'

type PageState = 'loading' | 'valid' | 'used' | 'expired' | 'invalid'

function ExpiryLabel({ invite }: { invite: Invite }) {
  const expiresMs = invite.expiresAt.toMillis()
  const now = Date.now()
  const daysLeft = differenceInDays(expiresMs, now)
  const hoursLeft = differenceInHours(expiresMs, now)

  if (daysLeft >= 2) return <span>{daysLeft} days</span>
  if (hoursLeft >= 1) return <span>{hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</span>
  return <span>less than 1 hour</span>
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, signIn, loading: authLoading } = useAuth()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [invite, setInvite] = useState<Invite | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  // Validate the token (no auth required)
  useEffect(() => {
    if (!token) {
      setState('invalid')
      return
    }

    getInvite(token)
      .then((inv) => {
        if (!inv) {
          setState('invalid')
          return
        }

        const now = Date.now()
        if (inv.status === 'used') {
          setState('used')
        } else if (
          inv.status === 'expired' ||
          inv.expiresAt.toMillis() < now
        ) {
          setState('expired')
        } else {
          setInvite(inv)
          // Store the token — it will be consumed during sign-in
          sessionStorage.setItem('pity_invite_token', token)
          setState('valid')
        }
      })
      .catch(() => setState('invalid'))
  }, [token])

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signIn()
      // AuthContext will handle the rest — profile creation and redirect
    } catch {
      setSigningIn(false)
    }
  }

  if (authLoading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-950 to-green-800">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  // ── Valid invite ──────────────────────────────────────────────────────────
  if (state === 'valid' && invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-950 via-green-900 to-green-800 p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Logo */}
          <div>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl mb-4">
              <span className="text-green-800 font-black text-4xl">P</span>
            </div>
            <h1 className="text-3xl font-black text-white">PITY Tour</h1>
            <p className="text-green-300 text-sm mt-1">
              Players' Invitational Tour — Yearly
            </p>
          </div>

          {/* Invite card */}
          <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-300" />
              </div>
              <div>
                <p className="font-bold text-lg">You're invited!</p>
                {invite.note && (
                  <p className="text-green-200 text-sm mt-1">"{invite.note}"</p>
                )}
              </div>

              <div className="text-xs text-green-300 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expires in <ExpiryLabel invite={invite} />
                </span>
              </div>

              <Button
                size="lg"
                className="w-full bg-white text-green-800 hover:bg-green-50 font-bold group"
                onClick={handleSignIn}
                disabled={signingIn}
              >
                {signingIn ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {signingIn ? 'Signing in...' : 'Sign in with Google to Join'}
                {!signingIn && (
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-green-400 text-xs">
            This invite is single-use. Don't share this link.
          </p>
        </div>
      </div>
    )
  }

  // ── Error states ──────────────────────────────────────────────────────────
  const errorConfig = {
    used: {
      icon: XCircle,
      iconClass: 'text-red-400',
      title: 'Invite Already Used',
      message:
        'This invite link has already been claimed. Each link can only be used once.',
      hint: 'Ask your admin to generate a new invite link for you.',
    },
    expired: {
      icon: Clock,
      iconClass: 'text-yellow-400',
      title: 'Invite Expired',
      message: 'This invite link has expired.',
      hint: 'Ask your admin to generate a fresh invite link.',
    },
    invalid: {
      icon: XCircle,
      iconClass: 'text-red-400',
      title: 'Invalid Invite Link',
      message: "We couldn't find this invite. The link may be incorrect or broken.",
      hint: 'Double-check the link or ask your admin to send a new one.',
    },
  }

  const config = errorConfig[state as keyof typeof errorConfig] ?? errorConfig.invalid
  const Icon = config.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-950 to-green-900 p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl">
          <span className="text-green-800 font-black text-4xl">P</span>
        </div>

        <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <Icon className={`w-10 h-10 mx-auto ${config.iconClass}`} />
            <h2 className="font-bold text-lg">{config.title}</h2>
            <p className="text-green-200 text-sm">{config.message}</p>
            <p className="text-green-400 text-xs">{config.hint}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
