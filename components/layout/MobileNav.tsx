'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  Flag,
  ScanLine,
  BarChart3,
  Menu,
  X,
  QrCode,
  ClipboardList,
  DollarSign,
  User,
  Shield,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

// Bottom tab nav — shows 5 most important items on mobile
const bottomTabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/submit-round', label: 'Submit', icon: Flag },
  { href: '/dashboard/attest', label: 'Attest', icon: ScanLine },
  { href: '/dashboard/leaderboard', label: 'Standings', icon: BarChart3 },
  { href: '/dashboard/my-qr', label: 'QR Code', icon: QrCode },
]

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/submit-round', label: 'Submit Round', icon: Flag },
  { href: '/dashboard/attest', label: 'Attest Round', icon: ScanLine },
  { href: '/dashboard/my-rounds', label: 'My Rounds', icon: ClipboardList },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/dashboard/prize-pool', label: 'Prize Pool', icon: DollarSign },
  { href: '/dashboard/my-qr', label: 'My QR Code', icon: QrCode },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()
  const { profile, logOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Top header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
            <span className="text-white font-black text-xs">P</span>
          </div>
          <span className="font-bold text-green-700">PITY Tour</span>
        </Link>

        <div className="flex items-center gap-2">
          <Avatar className="w-7 h-7">
            <AvatarImage src={profile?.photoURL} />
            <AvatarFallback>{profile?.displayName?.[0] ?? 'U'}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -mr-2"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <span className="font-bold text-green-700">Menu</span>
            <button onClick={() => setMenuOpen(false)} className="p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium',
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}

            {profile?.isAdmin && (
              <>
                <div className="pt-4 border-t mt-4">
                  <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin
                  </p>
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium',
                      pathname.startsWith('/admin')
                        ? 'bg-green-50 text-green-700'
                        : 'text-foreground hover:bg-accent'
                    )}
                  >
                    <Shield className="w-5 h-5 shrink-0" />
                    Admin Panel
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={profile?.photoURL} />
                <AvatarFallback>{profile?.displayName?.[0] ?? 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  HCP: {profile?.handicapIndex ?? '—'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMenuOpen(false)
                logOut()
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="flex items-stretch">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs',
                  isActive ? 'text-green-700' : 'text-muted-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    isActive ? 'text-green-600' : 'text-muted-foreground'
                  )}
                />
                <span className="truncate">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
