'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { getHandicapHistory } from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { HandicapSnapshot } from '@/lib/types'

interface HandicapChartProps {
  uid: string
  currentIndex: number
}

function formatDate(ts: { seconds: number } | undefined): string {
  if (!ts) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateFull(ts: { seconds: number }): string {
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'ghin': return 'GHIN Sync'
    case 'manual': return 'Manual Update'
    case 'initial': return 'Initial'
    default: return source
  }
}

export function HandicapChart({ uid, currentIndex }: HandicapChartProps) {
  const [snapshots, setSnapshots] = useState<HandicapSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHandicapHistory(uid)
      .then(setSnapshots)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uid])

  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }

  // Build chart data — include current index as the latest point if different
  const chartData = snapshots.map((s) => ({
    date: formatDate(s.recordedAt as any),
    dateFull: formatDateFull(s.recordedAt as any),
    index: s.handicapIndex,
    source: s.source,
  }))

  // If no history yet, show just the current value
  if (chartData.length === 0) {
    if (currentIndex <= 0) return null
    chartData.push({
      date: 'Now',
      dateFull: 'Current',
      index: currentIndex,
      source: 'initial',
    })
  }

  // Calculate trend
  const first = chartData[0]?.index ?? currentIndex
  const last = chartData[chartData.length - 1]?.index ?? currentIndex
  const diff = last - first
  const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus
  const trendColor = diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-muted-foreground'
  const trendText = diff < 0
    ? `Down ${Math.abs(diff).toFixed(1)} this season`
    : diff > 0
    ? `Up ${diff.toFixed(1)} this season`
    : 'No change'

  // Y-axis bounds
  const values = chartData.map((d) => d.index)
  const min = Math.floor(Math.min(...values) - 2)
  const max = Math.ceil(Math.max(...values) + 2)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Handicap Trend</CardTitle>
            <CardDescription>{chartData.length} update{chartData.length !== 1 ? 's' : ''} recorded</CardDescription>
          </div>
          <div className={`flex items-center gap-1.5 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{trendText}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length <= 1 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-3xl font-bold text-foreground mb-1">{currentIndex}</p>
            <p className="text-sm">Current Handicap Index</p>
            <p className="text-xs mt-2">
              Trend data will appear as your handicap updates over the season.
            </p>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[min, max]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-2.5 text-sm">
                        <p className="font-bold">{d.index}</p>
                        <p className="text-muted-foreground text-xs">{d.dateFull}</p>
                        <p className="text-muted-foreground text-xs">{sourceLabel(d.source)}</p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine
                  y={currentIndex}
                  stroke="#16a34a"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="index"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 3 }}
                  activeDot={{ fill: '#16a34a', r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
