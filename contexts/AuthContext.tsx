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
import { getUserProfile, createUserProfile } from '@/lib/firebase/firestore'
import { claimInvite } from '@/lib/firebase/invites'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  profileComplete: boolean
  inviteRequired: boolean   // true when user signed in without a valid invite
  inviteError: string | null
  signIn: () => Promise<void>
  logOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteRequired, setInviteRequired] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const loadProfile = useCallback(async (firebaseUser: User) => {
    let userProfile = await getUserProfile(firebaseUser.uid)

    if (!userProfile) {
      // First login — check for a valid invite token in session
      const token = sessionStorage.getItem('pity_invite_token')

      if (!token) {
        // No invite token present — reject sign-in
        await signOut()
        setUser(null)
        setInviteRequired(true)
        setInviteError(
          'This app is invite-only. Please use your personal invite link before signing in.'
        )
        return
      }

      try {
        await claimInvite(token, firebaseUser.uid, firebaseUser.email ?? '')
        sessionStorage.removeItem('pity_invite_token')
      } catch (err: unknown) {
        // Invite was invalid, expired, or already used — reject sign-in
        await signOut()
        setUser(null)
        setInviteRequired(true)
        const msg = err instanceof Error ? err.message : ''
        setInviteError(
          msg === 'INVITE_ALREADY_USED'
            ? 'This invite link has already been used. Ask your admin for a new one.'
            : msg === 'INVITE_EXPIRED'
            ? 'This invite link has expired. Ask your admin for a new one.'
            : 'Invalid invite link. Please check the link and try again.'
        )
        return
      }

      // Invite claimed — create the new member profile
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
        inviteToken: token,
      })
      userProfile = await getUserProfile(firebaseUser.uid)
    }

    // Existing users and newly registered users both land here
    setInviteRequired(false)
    setInviteError(null)
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
    setInviteRequired(false)
    setInviteError(null)
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user)
    }
  }

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
        inviteRequired,
        inviteError,
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
