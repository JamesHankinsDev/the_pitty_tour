'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getAllUsers } from '@/lib/firebase/firestore'
import type { UserProfile } from '@/lib/types'

interface UsersContextValue {
  users: UserProfile[]
  loading: boolean
  getUserName: (uid: string) => string
}

const UsersContext = createContext<UsersContextValue | null>(null)

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemo } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo || !user) {
      setLoading(false)
      return
    }

    getAllUsers()
      .then(setUsers)
      .catch((err) => console.warn('Failed to load users:', err))
      .finally(() => setLoading(false))
  }, [user, isDemo])

  // Build a uid → displayName lookup map so getUserName is O(1)
  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      map.set(u.uid, u.displayName)
    }
    return map
  }, [users])

  const getUserName = useCallback(
    (uid: string) => nameMap.get(uid) ?? uid.slice(0, 8),
    [nameMap]
  )

  const value = useMemo(
    () => ({ users, loading, getUserName }),
    [users, loading, getUserName]
  )

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) {
    throw new Error('useUsers must be used within UsersProvider')
  }
  return ctx
}
