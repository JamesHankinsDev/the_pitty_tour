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
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase/firestore'
import { claimInvite, getInviteByUser } from '@/lib/firebase/invites'
import { setDemoMode } from '@/lib/firebase/firestore'
import { DEMO_PROFILE } from '@/lib/demo/data'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  profileComplete: boolean
  inviteRequired: boolean
  inviteError: string | null
  isDemo: boolean
  signIn: () => Promise<void>
  logOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  enterDemo: () => void
  exitDemo: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteRequired, setInviteRequired] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const loadProfile = useCallback(async (firebaseUser: User) => {
    let userProfile = await getUserProfile(firebaseUser.uid)

    if (!userProfile) {
      // First login — check for a valid invite token in session
      const token = sessionStorage.getItem('pity_invite_token')

      if (token) {
        // Normal flow: claim invite then create profile
        try {
          await claimInvite(token, firebaseUser.uid, firebaseUser.email ?? '')
          sessionStorage.removeItem('pity_invite_token')
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : ''
          await signOut()
          setUser(null)
          setInviteRequired(true)
          setInviteError(
            msg === 'INVITE_ALREADY_USED'
              ? 'This invite link has already been used. Ask your admin for a new one.'
              : msg === 'INVITE_EXPIRED'
              ? 'This invite link has expired. Ask your admin for a new one.'
              : 'Invalid invite link. Please check the link and try again.'
          )
          return
        }

        // Invite claimed — now create profile. If this fails, the recovery
        // path below will catch it on their next sign-in attempt.
        try {
          await createUserProfile(firebaseUser.uid, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoURL: firebaseUser.photoURL ?? '',
            handicapIndex: 0,
            ghinNumber: '',
            venmoHandle: '',
            qrCode: firebaseUser.uid,
            totalPoints: 0,
            isAdmin: false,
            inviteToken: token,
          })
          userProfile = await getUserProfile(firebaseUser.uid)
        } catch (profileErr) {
          console.error('Profile creation failed after invite claim:', profileErr)
          await signOut()
          setUser(null)
          setInviteRequired(true)
          setInviteError(
            'Account setup failed. Please try signing in again — your invite is still valid.'
          )
          return
        }
      } else {
        // No token in session — check if this user already claimed an invite
        // but profile creation failed on a previous attempt.
        const claimedInvite = await getInviteByUser(firebaseUser.uid).catch(() => null)

        if (claimedInvite) {
          // Recovery: invite was claimed previously — create profile now
          try {
            await createUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? '',
              email: firebaseUser.email ?? '',
              photoURL: firebaseUser.photoURL ?? '',
              handicapIndex: 0,
              ghinNumber: '',
              venmoHandle: '',
              qrCode: firebaseUser.uid,
              totalPoints: 0,
              isAdmin: false,
              inviteToken: claimedInvite.token,
            })
            userProfile = await getUserProfile(firebaseUser.uid)
          } catch {
            await signOut()
            setUser(null)
            setInviteRequired(true)
            setInviteError(
              'Account setup failed. Please contact your admin for help.'
            )
            return
          }
        } else {
          await signOut()
          setUser(null)
          setInviteRequired(true)
          setInviteError(
            'This app is invite-only. Please use your personal invite link before signing in.'
          )
          return
        }
      }
    }

    setInviteRequired(false)
    setInviteError(null)
    setProfile(userProfile)

    // Silently refresh handicap from GHIN for users who have linked their number
    if (userProfile?.ghinNumber) {
      refreshHandicapFromGhin(userProfile).catch(() => {
        // Non-critical — silently ignore GHIN lookup failures on login
      })
    }
  }, [])

  const refreshHandicapFromGhin = async (userProfile: UserProfile) => {
    const res = await fetch('/api/ghin/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghinNumber: userProfile.ghinNumber }),
    })

    if (!res.ok) return

    const data = await res.json()
    const newIndex = data.handicapIndex

    // Skip update if GHIN returned NH or null
    if (data.noHandicap || newIndex === null) return

    if (typeof newIndex === 'number' && newIndex !== userProfile.handicapIndex) {
      await updateUserProfile(userProfile.uid, { handicapIndex: newIndex })
      const updated = await getUserProfile(userProfile.uid)
      if (updated) setProfile(updated)
    }
  }

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
    if (isDemo) {
      exitDemo()
      return
    }
    await signOut()
    setUser(null)
    setProfile(null)
    setInviteRequired(false)
    setInviteError(null)
  }

  const refreshProfile = async () => {
    if (isDemo) return
    if (user) {
      await loadProfile(user)
    }
  }

  const enterDemo = () => {
    setIsDemo(true)
    setDemoMode(true)
    setProfile(DEMO_PROFILE)
    setLoading(false)
  }

  const exitDemo = () => {
    setIsDemo(false)
    setDemoMode(false)
    setProfile(null)
  }

  const profileComplete = isDemo || (
    !!profile &&
    !!profile.displayName &&
    profile.venmoHandle !== '' &&
    profile.handicapIndex !== 0
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileComplete,
        inviteRequired,
        inviteError,
        isDemo,
        signIn,
        logOut,
        refreshProfile,
        enterDemo,
        exitDemo,
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
