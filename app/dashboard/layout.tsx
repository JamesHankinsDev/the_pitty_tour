'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { InviteGate } from '@/components/auth/InviteGate'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { UsersProvider } from '@/contexts/UsersContext'
import { PushPrompt } from '@/components/notifications/PushPrompt'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { RoleOnboarding } from '@/components/onboarding/RoleOnboarding'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, profileComplete, inviteRequired, inviteError, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !isDemo && !inviteRequired) {
      router.replace('/')
    }
  }, [user, loading, inviteRequired, isDemo, router])

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

  if (!user && !isDemo) return null

  // Force profile completion before using app (skip in demo)
  if (!isDemo && !profileComplete) {
    return <ProfileSetup />
  }

  return (
    <UsersProvider>
      <div className="min-h-screen flex flex-col">
        {isDemo && <DemoBanner />}
        <div className="flex flex-1">
          {/* Sidebar nav — desktop only */}
          <aside className={`hidden lg:flex w-60 shrink-0 border-r flex-col fixed ${isDemo ? 'top-10' : 'top-0'} bottom-0 left-0 z-30 bg-background`}>
            <DashboardNav />
          </aside>

          {/* Mobile nav */}
          <MobileNav />

          {/* Main content — extra padding accounts for safe-area insets on iOS */}
          <main className="flex-1 lg:ml-60">
            <div
              className={`${
                isDemo
                  ? 'pt-24 lg:pt-10'
                  : 'pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0'
              } pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0`}
            >
              {children}
            </div>
          </main>
        </div>
        {/* Push notification prompt */}
        <PushPrompt />
        {/* First-time onboarding */}
        <OnboardingTour />
        {/* Role onboarding (after election win) */}
        <RoleOnboarding />
      </div>
    </UsersProvider>
  )
}
