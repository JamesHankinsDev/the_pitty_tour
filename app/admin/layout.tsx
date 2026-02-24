'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import {
  Shield,
  Users,
  Calendar,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
  { href: '/admin/rounds', label: 'Rounds', icon: ClipboardList },
  { href: '/admin/prize-pool', label: 'Prize Pool', icon: DollarSign },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/')
      } else if (!profile?.isAdmin) {
        router.replace('/dashboard')
      }
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!user || !profile?.isAdmin) return null

  return (
    <div className="min-h-screen flex">
      {/* Admin Sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 border-r flex-col fixed inset-y-0 left-0 z-30 bg-green-950">
        <div className="px-4 py-5 border-b border-green-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <p className="font-bold text-sm text-white">Admin Panel</p>
              <p className="text-xs text-green-400">PITY Tour</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== '/admin'
                ? true
                : pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-800 text-white'
                    : 'text-green-300 hover:bg-green-900 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-green-800 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-green-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile admin header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-green-950 border-b border-green-800 flex items-center gap-3 px-4 h-14">
        <Shield className="w-5 h-5 text-green-400" />
        <span className="font-bold text-white">Admin Panel</span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-green-400 text-sm">
          ← App
        </Link>
      </div>

      {/* Mobile admin bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-green-950 border-t border-green-800">
        <div className="flex items-stretch">
          {adminNav.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs',
                  isActive ? 'text-white' : 'text-green-400'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="flex-1 lg:ml-56">
        <div className="pt-14 pb-16 lg:pt-0 lg:pb-0">{children}</div>
      </main>
    </div>
  )
}
