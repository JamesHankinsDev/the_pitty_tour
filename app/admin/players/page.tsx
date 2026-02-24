'use client'

import { useEffect, useState } from 'react'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import {
  getAllUsers,
  getSeasonRegistrations,
  createRegistration,
  updateRegistration,
  updateUserProfile,
} from '@/lib/firebase/firestore'
import { formatTimestamp } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  UserPlus,
} from 'lucide-react'
import type { UserProfile, Registration } from '@/lib/types'
import { serverTimestamp } from 'firebase/firestore'

export const dynamic = 'force-dynamic'

export default function AdminPlayersPage() {
  const { season } = useActiveSeason()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    const [allUsers, allRegs] = await Promise.all([
      getAllUsers(),
      season ? getSeasonRegistrations(season.id) : Promise.resolve([]),
    ])
    setUsers(allUsers)
    setRegs(allRegs)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [season])

  const getRegForUser = (uid: string) =>
    regs.find((r) => r.uid === uid)

  const handleRegister = async (uid: string) => {
    if (!season) return
    try {
      await createRegistration({
        uid,
        seasonId: season.id,
        hasPaidRegistration: false,
        monthlyPayments: {},
        forfeitedMonths: [],
        totalForfeited: 0,
        registeredAt: null as any,
      })
      toast.success('Player registered for season!')
      loadData()
    } catch {
      toast.error('Failed to register player.')
    }
  }

  const handleToggleRegistrationPaid = async (reg: Registration) => {
    try {
      await updateRegistration(reg.id, {
        hasPaidRegistration: !reg.hasPaidRegistration,
      })
      toast.success('Payment status updated!')
      loadData()
    } catch {
      toast.error('Update failed.')
    }
  }

  const handleToggleMonthPaid = async (reg: Registration, month: string) => {
    try {
      await updateRegistration(reg.id, {
        monthlyPayments: {
          ...reg.monthlyPayments,
          [month]: !reg.monthlyPayments[month],
        },
      })
      toast.success(`${month} payment toggled.`)
      loadData()
    } catch {
      toast.error('Update failed.')
    }
  }

  const handleToggleAdmin = async (user: UserProfile) => {
    try {
      await updateUserProfile(user.uid, { isAdmin: !user.isAdmin })
      toast.success(`Admin ${user.isAdmin ? 'removed' : 'granted'} for ${user.displayName}`)
      loadData()
    } catch {
      toast.error('Update failed.')
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-green-600" />
            Players
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} total · {regs.filter((r) => r.hasPaidRegistration).length} paid
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const reg = getRegForUser(user.uid)
          return (
            <Card key={user.uid}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{user.displayName}</p>
                      {user.isAdmin && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      HCP: {user.handicapIndex} · @{user.venmoHandle || 'not set'} ·
                      Member: {formatTimestamp(user.memberSince as any)}
                    </p>

                    {/* Season registration */}
                    {season && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {reg ? (
                          <>
                            <button
                              onClick={() => handleToggleRegistrationPaid(reg)}
                              className="text-xs"
                            >
                              <Badge
                                variant={
                                  reg.hasPaidRegistration ? 'success' : 'warning'
                                }
                                className="cursor-pointer"
                              >
                                {reg.hasPaidRegistration
                                  ? '✓ Reg Paid'
                                  : '✗ Reg Unpaid'}
                              </Badge>
                            </button>
                            {reg.forfeitedMonths.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {reg.forfeitedMonths.length} forfeit(s)
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegister(user.uid)}
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Register for {season.year}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAdmin(user)}
                    className="shrink-0 text-xs"
                  >
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
