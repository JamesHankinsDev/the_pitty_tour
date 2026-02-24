'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveSeason } from '@/lib/hooks/useSeason'
import {
  getUserByUid,
  getPlayerRoundsForMonth,
  addAttestation,
} from '@/lib/firebase/firestore'
import { getCurrentMonthKey, formatMonthKey } from '@/lib/utils/dates'
import { QRScanner } from '@/components/qr/QRScanner'
import { RoundCard } from '@/components/rounds/RoundCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import type { Round, UserProfile } from '@/lib/types'
import {
  ScanLine,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  User,
  RotateCcw,
} from 'lucide-react'
import { serverTimestamp, Timestamp } from 'firebase/firestore'

export const dynamic = 'force-dynamic'

type Step = 'scan' | 'review' | 'success'

export default function AttestPage() {
  const { profile, user } = useAuth()
  const { season } = useActiveSeason()

  const [step, setStep] = useState<Step>('scan')
  const [loading, setLoading] = useState(false)
  const [scannedPlayer, setScannedPlayer] = useState<UserProfile | null>(null)
  const [playerRounds, setPlayerRounds] = useState<Round[]>([])
  const [selectedRound, setSelectedRound] = useState<Round | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentMonth = getCurrentMonthKey()

  const handleScan = async (uid: string) => {
    if (!profile || !user) return
    setError(null)

    // Can't attest yourself
    if (uid === user.uid) {
      toast.error("You can't scan your own QR code!")
      return
    }

    setLoading(true)
    try {
      // Look up the scanned player
      const player = await getUserByUid(uid)
      if (!player) {
        setError('Player not found. Make sure you scanned a valid PITY Tour QR code.')
        setLoading(false)
        return
      }

      // Find their pending rounds for this month
      const rounds = await getPlayerRoundsForMonth(uid, currentMonth)
      const unattested = rounds.filter(
        (r) =>
          !r.isValid &&
          !r.attestations.some((a) => a.attestorUid === user.uid)
      )

      setScannedPlayer(player)
      setPlayerRounds(unattested)

      if (unattested.length === 0) {
        const allRounds = await getPlayerRoundsForMonth(uid, currentMonth)
        if (allRounds.length === 0) {
          setError(`${player.displayName} hasn't submitted a round for ${formatMonthKey(currentMonth)} yet.`)
        } else {
          setError(`You've already attested all of ${player.displayName}'s rounds for this month, or their rounds are already valid.`)
        }
      }

      setStep('review')
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAttest = async (round: Round) => {
    if (!profile || !user) return
    setLoading(true)
    setSelectedRound(round)

    try {
      await addAttestation(round.id, {
        attestorUid: user.uid,
        attestorName: profile.displayName,
        attestedAt: Timestamp.now(),
        method: 'qr_scan',
      })

      const wasJustValidated = round.attestations.length + 1 >= 2
      setStep('success')

      if (wasJustValidated) {
        toast.success(`🎉 ${scannedPlayer?.displayName}'s round is now VALID!`)
      } else {
        toast.success(`Attested! ${round.attestations.length + 1}/2 done.`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attestation failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('scan')
    setScannedPlayer(null)
    setPlayerRounds([])
    setSelectedRound(null)
    setError(null)
  }

  return (
    <div className="p-4 lg:p-8 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-green-600" />
          Attest a Round
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan a player's QR code to confirm their round
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-sm">
        {(['scan', 'review', 'success'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? 'bg-green-600 text-white'
                  : (step === 'review' && s === 'scan') ||
                    step === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={
                step === s
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step: Scan */}
      {step === 'scan' && (
        <div className="space-y-4">
          <QRScanner onScan={handleScan} />

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Can't scan? Ask the player to show their Player ID from their
              profile.
            </p>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && scannedPlayer && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Scan Again
          </Button>

          {/* Player info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={scannedPlayer.photoURL} />
                  <AvatarFallback>
                    {scannedPlayer.displayName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{scannedPlayer.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    HCP: {scannedPlayer.handicapIndex}
                  </p>
                </div>
                <Badge variant="success" className="ml-auto">
                  Player Found
                </Badge>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                Select a round to attest for{' '}
                {formatMonthKey(currentMonth)}:
              </p>
              <div className="space-y-3">
                {playerRounds.map((round) => (
                  <div key={round.id} className="relative">
                    <RoundCard round={round} />
                    <div className="mt-2">
                      <Button
                        variant="green"
                        className="w-full"
                        onClick={() => handleAttest(round)}
                        disabled={loading}
                      >
                        {loading && selectedRound?.id === round.id
                          ? 'Attesting...'
                          : `Attest This Round`}
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <p className="text-xs text-blue-800">
                    By attesting, you confirm that you played with{' '}
                    {scannedPlayer.displayName} and witnessed their score.
                    Attestations are permanent.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && selectedRound && scannedPlayer && (
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">Attestation Complete!</h2>
          <p className="text-muted-foreground text-sm">
            You've attested {scannedPlayer.displayName}'s round at{' '}
            {selectedRound.courseName}.
          </p>

          {selectedRound.attestations.length + 1 >= 2 && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-green-800 font-semibold text-sm">
                🎉 This round is now fully valid!
              </p>
              <p className="text-green-700 text-xs mt-1">
                {scannedPlayer.displayName}'s round will count toward this
                month's standings.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button variant="green" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Attest Another Round
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
