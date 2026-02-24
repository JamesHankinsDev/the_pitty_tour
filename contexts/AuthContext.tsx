'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { User } from 'firebase/auth'
import { onAuthChange, signInWithGoogle, signOut } from '@/lib/firebase/auth'
import {
  getUserProfile,
  createUserProfile,
} from '@/lib/firebase/firestore'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  profileComplete: boolean
  signIn: () => Promise<void>
  logOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (firebaseUser: User) => {
    let userProfile = await getUserProfile(firebaseUser.uid)

    if (!userProfile) {
      // First login — create a minimal profile
      await createUserProfile(firebaseUser.uid, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? '',
        email: firebaseUser.email ?? '',
        photoURL: firebaseUser.photoURL ?? '',
        handicapIndex: 0,
        venmoHandle: '',
        qrCode: firebaseUser.uid,
        totalPoints: 0,
        isAdmin: false,
      })
      userProfile = await getUserProfile(firebaseUser.uid)
    }

    setProfile(userProfile)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadProfile(firebaseUser)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [loadProfile])

  const signIn = async () => {
    const firebaseUser = await signInWithGoogle()
    setUser(firebaseUser)
    await loadProfile(firebaseUser)
  }

  const logOut = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user)
    }
  }

  // Profile is "complete" when handicap and venmo have been set
  const profileComplete =
    !!profile &&
    !!profile.displayName &&
    profile.venmoHandle !== '' &&
    profile.handicapIndex !== 0

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileComplete,
        signIn,
        logOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
