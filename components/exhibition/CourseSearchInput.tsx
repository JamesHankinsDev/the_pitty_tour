'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, MapPin, CheckCircle2, Loader2, Database, Globe } from 'lucide-react'
import {
  searchCoursesForExhibition,
  importCourseFromApi,
  type CourseSearchItem,
} from '@/lib/utils/exhibitionCourses'
import type { CachedCourse } from '@/lib/types'
import { toast } from 'sonner'

interface CourseSearchInputProps {
  onCourseSelected: (course: CachedCourse) => void
  selectedCourse?: CachedCourse | null
}

export function CourseSearchInput({ onCourseSelected, selectedCourse }: CourseSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CourseSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      const res = await searchCoursesForExhibition(query)
      setResults(res)
      setSearching(false)
      setShowResults(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (item: CourseSearchItem) => {
    setShowResults(false)
    if (item.fromCache && item.cached) {
      onCourseSelected(item.cached)
      toast.success(`Loaded ${item.courseName} from cache`)
      return
    }
    if (!item.apiId) return

    setImporting(item.key)
    try {
      const imported = await importCourseFromApi(item.apiId)
      if (imported) {
        onCourseSelected(imported)
        toast.success(`Imported ${item.courseName}`)
      } else {
        toast.error('Failed to load course details')
      }
    } catch {
      toast.error('Failed to load course details')
    } finally {
      setImporting(null)
    }
  }

  if (selectedCourse) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{selectedCourse.courseName}</p>
            <p className="text-xs text-muted-foreground">
              {[selectedCourse.city, selectedCourse.state].filter(Boolean).join(', ')}
              {' · '}{selectedCourse.holes.length} holes · Par {selectedCourse.par}
            </p>
          </div>
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Change
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a course..."
          className="pl-9"
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
      </div>
      {showResults && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {searching ? (
            <p className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching...
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">No matches. Try a different query.</p>
          ) : (
            results.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={importing === item.key}
                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b last:border-0 disabled:opacity-50"
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.courseName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[item.city, item.state, item.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                    {importing === item.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.fromCache ? (
                      <><Database className="w-3 h-3" /> Cached</>
                    ) : (
                      <><Globe className="w-3 h-3" /> API</>
                    )}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
