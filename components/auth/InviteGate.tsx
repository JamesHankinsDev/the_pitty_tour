'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface InviteGateProps {
  error: string | null
}

export function InviteGate({ error }: InviteGateProps) {
  const { logOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-950 to-green-900 p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-2xl">
          <span className="text-green-800 font-black text-4xl">P</span>
        </div>

        <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h2 className="font-bold text-lg">Invite Required</h2>
              <p className="text-green-200 text-sm mt-2">
                {error ??
                  'The PITY Tour is invite-only. You need a personal invite link to join.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10"
                onClick={logOut}
                asChild
              >
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-green-400 text-xs">
          Already have an invite link? Open it in your browser to get started.
        </p>
      </div>
    </div>
  )
}
