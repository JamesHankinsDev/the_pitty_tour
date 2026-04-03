'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
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

  const getUserName = (uid: string) =>
    users.find((u) => u.uid === uid)?.displayName ?? uid.slice(0, 8)

  return (
    <UsersContext.Provider value={{ users, loading, getUserName }}>
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
