'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  User,
  QrCode,
  Flag,
  ClipboardList,
  BarChart3,
  DollarSign,
  ScanLine,
  Shield,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/submit-round', label: 'Submit Round', icon: Flag },
  { href: '/dashboard/attest', label: 'Attest Round', icon: ScanLine },
  { href: '/dashboard/my-rounds', label: 'My Rounds', icon: ClipboardList },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/dashboard/prize-pool', label: 'Prize Pool', icon: DollarSign },
  { href: '/dashboard/my-qr', label: 'My QR Code', icon: QrCode },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

const adminItems = [
  { href: '/admin', label: 'Admin', icon: Shield },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { profile, logOut } = useAuth()

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-none text-green-700">PITY Tour</p>
            <p className="text-xs text-muted-foreground">Golf League</p>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-50 text-green-700 font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {profile?.isAdmin && (
          <div className="mt-6 pt-4 border-t">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* User info + logout */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.photoURL} />
            <AvatarFallback>
              {profile?.displayName?.[0] ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.displayName ?? 'Player'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              HCP: {profile?.handicapIndex ?? '—'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={logOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </nav>
  )
}
