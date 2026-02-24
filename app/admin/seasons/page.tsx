'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAllSeasons } from '@/lib/hooks/useSeason'
import { createSeason, updateSeason } from '@/lib/firebase/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Plus, CheckCircle2 } from 'lucide-react'
import type { Season } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const schema = z.object({
  year: z.number().min(2020).max(2050),
  startMonth: z.number().min(1).max(12),
  endMonth: z.number().min(1).max(12),
  registrationFee: z.number().min(0),
  monthlyDue: z.number().min(0),
})

type FormData = z.infer<typeof schema>

export default function AdminSeasonsPage() {
  const { seasons, loading } = useAllSeasons()
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: new Date().getFullYear(),
      startMonth: 4,
      endMonth: 11,
      registrationFee: 100,
      monthlyDue: 50,
    },
  })

  const onSubmit = async (data: FormData) => {
    setCreating(true)
    try {
      await createSeason({
        ...data,
        isActive: false,
      })
      toast.success('Season created!')
      setShowForm(false)
      reset()
    } catch {
      toast.error('Failed to create season.')
    } finally {
      setCreating(false)
    }
  }

  const handleSetActive = async (season: Season) => {
    try {
      // Deactivate all others
      for (const s of seasons) {
        if (s.id !== season.id && s.isActive) {
          await updateSeason(s.id, { isActive: false })
        }
      }
      await updateSeason(season.id, { isActive: !season.isActive })
      toast.success(
        season.isActive ? 'Season deactivated' : 'Season is now active!'
      )
    } catch {
      toast.error('Update failed.')
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-green-600" />
            Seasons
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage season configurations
          </p>
        </div>
        <Button
          variant="green"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Season
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create New Season</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    {...register('year', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration Fee ($)</Label>
                  <Input
                    type="number"
                    {...register('registrationFee', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Month (1-12)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    {...register('startMonth', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Month (1-12)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    {...register('endMonth', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Monthly Due ($)</Label>
                  <Input
                    type="number"
                    {...register('monthlyDue', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="green" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Season'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Seasons list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : seasons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No seasons created yet</p>
          </div>
        ) : (
          seasons.map((season) => (
            <Card
              key={season.id}
              className={season.isActive ? 'border-green-300' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{season.year} Season</p>
                      {season.isActive && (
                        <Badge variant="success">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {MONTH_NAMES[season.startMonth]} –{' '}
                      {MONTH_NAMES[season.endMonth]}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>
                        Reg: <strong>${season.registrationFee}</strong>
                      </span>
                      <span>
                        Monthly: <strong>${season.monthlyDue}</strong>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={season.isActive ? 'outline' : 'green'}
                    size="sm"
                    onClick={() => handleSetActive(season)}
                  >
                    {season.isActive ? 'Deactivate' : 'Set Active'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
