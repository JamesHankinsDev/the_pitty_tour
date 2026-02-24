'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { InviteGate } from '@/components/auth/InviteGate'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, profileComplete, inviteRequired, inviteError } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !inviteRequired) {
      router.replace('/')
    }
  }, [user, loading, inviteRequired, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full mx-auto animate-pulse" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      </div>
    )
  }

  // Signed in without a valid invite — show rejection screen
  if (inviteRequired) {
    return <InviteGate error={inviteError} />
  }

  if (!user) return null

  // Force profile completion before using app
  if (!profileComplete) {
    return <ProfileSetup />
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar nav — desktop only */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r flex-col fixed inset-y-0 left-0 z-30 bg-background">
        <DashboardNav />
      </aside>

      {/* Mobile nav */}
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 lg:ml-60">
        {/* Top padding for mobile header */}
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  )
}
