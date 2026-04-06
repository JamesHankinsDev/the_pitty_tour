'use client'

import { useState, useEffect } from 'react'
import {
  searchLocations,
  getMultiDayForecast,
  windCompass,
  type LocationResult,
  type Forecast,
} from '@/lib/utils/weather'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Cloud, Search, MapPin, Wind, Droplets, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'


const FAVORITES_KEY = 'pity_weather_favorites'

interface SavedLocation {
  name: string
  subtitle: string
  latitude: number
  longitude: number
}

export default function WeatherPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selected, setSelected] = useState<SavedLocation | null>(null)
  const [forecast, setForecast] = useState<Forecast[]>([])
  const [loadingForecast, setLoadingForecast] = useState(false)
  const [favorites, setFavorites] = useState<SavedLocation[]>([])

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (saved) {
      try { setFavorites(JSON.parse(saved)) } catch {}
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      const res = await searchLocations(query)
      setResults(res)
      setSearching(false)
      setShowResults(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch forecast when location selected
  useEffect(() => {
    if (!selected) { setForecast([]); return }
    setLoadingForecast(true)
    getMultiDayForecast(selected.latitude, selected.longitude, 7)
      .then(setForecast)
      .finally(() => setLoadingForecast(false))
  }, [selected])

  const saveFavorites = (next: SavedLocation[]) => {
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  const handleSelectResult = (r: LocationResult) => {
    const loc: SavedLocation = {
      name: r.name,
      subtitle: [r.admin1, r.country].filter(Boolean).join(', '),
      latitude: r.latitude,
      longitude: r.longitude,
    }
    setSelected(loc)
    setQuery('')
    setShowResults(false)
  }

  const toggleFavorite = () => {
    if (!selected) return
    const exists = favorites.find(
      (f) => f.latitude === selected.latitude && f.longitude === selected.longitude
    )
    if (exists) {
      saveFavorites(favorites.filter((f) => f !== exists))
    } else {
      saveFavorites([...favorites, selected])
    }
  }

  const isFavorited = selected && favorites.some(
    (f) => f.latitude === selected.latitude && f.longitude === selected.longitude
  )

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cloud className="w-6 h-6 text-green-600" />
          Weather
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plan your round with 7-day forecasts for any city
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a city..."
            className="pl-9"
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
        </div>
        {showResults && (results.length > 0 || searching) && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
            {searching ? (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">Searching...</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-0"
                  onMouseDown={(e) => { e.preventDefault(); handleSelectResult(r) }}
                >
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Favorites */}
      {!selected && favorites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Saved Locations
          </p>
          <div className="space-y-2">
            {favorites.map((fav, i) => (
              <button
                key={i}
                onClick={() => setSelected(fav)}
                className="w-full text-left"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{fav.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{fav.subtitle}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected location + forecast */}
      {selected && (
        <>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-base">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isFavorited ? 'green' : 'outline'}
                  size="sm"
                  onClick={toggleFavorite}
                >
                  {isFavorited ? 'Saved' : 'Save'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 7-day forecast */}
          {loadingForecast ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : forecast.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Forecast unavailable.
            </p>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">7-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {forecast.map((f, i) => {
                  const date = parseISO(f.date)
                  const isToday = i === 0
                  return (
                    <div
                      key={f.date}
                      className={`flex items-center gap-3 py-2.5 ${i < forecast.length - 1 ? 'border-b' : ''}`}
                    >
                      <div className="w-14 shrink-0">
                        <p className="text-sm font-semibold">
                          {isToday ? 'Today' : format(date, 'EEE')}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(date, 'MMM d')}</p>
                      </div>
                      <div className="text-2xl leading-none shrink-0" title={f.summary}>{f.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{f.summary}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {f.precipProb > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Droplets className="w-3 h-3" />
                              {f.precipProb}%
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Wind className="w-3 h-3" />
                            {f.windSpeed} {windCompass(f.windDirection)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm">
                          <span className="font-bold">{f.tempHigh}&deg;</span>
                          <span className="text-muted-foreground"> / {f.tempLow}&deg;</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!selected && favorites.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Cloud className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Search for a city</p>
          <p className="text-sm mt-1">See the 7-day forecast to plan your next round.</p>
        </div>
      )}
    </div>
  )
}
