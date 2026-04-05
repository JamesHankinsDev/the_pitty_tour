'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UsersProvider } from '@/contexts/UsersContext'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Exhibition mode runs outside the standard dashboard layout — it's
 * a standalone, focused game mode with no sidebar distraction.
 * Still requires auth, but no profile-complete check (casual mode).
 */
export default function ExhibitionLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.replace('/')
    }
  }, [user, loading, isDemo, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton className="h-32 w-full max-w-sm" />
      </div>
    )
  }

  if (!user && !isDemo) return null

  return <UsersProvider>{children}</UsersProvider>
}
