'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  addCourse,
  subscribeToCourses,
  toggleCourseFavorite,
  deleteCourse,
} from '@/lib/firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  MapPin,
  Search,
  Plus,
  Heart,
  ExternalLink,
  DollarSign,
  Star,
  Trash2,
  X,
  Globe,
} from 'lucide-react'
import type { Course } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function CoursesPage() {
  const { profile, user, isDemo } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: '',
    holes: 18 as 9 | 18 | 27 | 36,
    greenFeeMin: '',
    greenFeeMax: '',
    courseRating: '',
    slopeRating: '',
    bookingUrl: '',
    websiteUrl: '',
    notes: '',
  })

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }
    const unsub = subscribeToCourses((c) => {
      setCourses(c)
      setLoading(false)
    })
    return unsub
  }, [isDemo])

  const resetForm = () => {
    setForm({
      name: '', city: '', state: '', holes: 18,
      greenFeeMin: '', greenFeeMax: '', courseRating: '',
      slopeRating: '', bookingUrl: '', websiteUrl: '', notes: '',
    })
  }

  const handleAdd = async () => {
    if (!profile || !user) return
    if (!form.name.trim() || !form.city.trim() || !form.state.trim()) {
      toast.error('Name, city, and state are required.')
      return
    }
    setSubmitting(true)
    try {
      await addCourse({
        name: form.name.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        holes: form.holes,
        greenFeeMin: Number(form.greenFeeMin) || 0,
        greenFeeMax: Number(form.greenFeeMax) || 0,
        courseRating: form.courseRating ? Number(form.courseRating) : undefined,
        slopeRating: form.slopeRating ? Number(form.slopeRating) : undefined,
        bookingUrl: form.bookingUrl.trim() || undefined,
        websiteUrl: form.websiteUrl.trim() || undefined,
        notes: form.notes.trim(),
        addedByUid: user.uid,
        addedByName: profile.displayName,
      })
      toast.success('Course added!')
      resetForm()
      setShowForm(false)
    } catch {
      toast.error('Failed to add course.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFavorite = async (courseId: string, currentlyFavorited: boolean) => {
    if (!user) return
    try {
      await toggleCourseFavorite(courseId, user.uid, !currentlyFavorited)
    } catch {
      toast.error('Failed to update favorite.')
    }
  }

  const handleDelete = async (courseId: string) => {
    try {
      await deleteCourse(courseId)
      toast.success('Course removed.')
    } catch {
      toast.error('Failed to delete course.')
    }
  }

  const filtered = courses.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
    const matchesFav = showFavoritesOnly
      ? c.favoritedBy?.includes(user?.uid ?? '')
      : true
    return matchesSearch && matchesFav
  })

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-600" />
            Course Directory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {courses.length} course{courses.length !== 1 ? 's' : ''} &middot; community curated
          </p>
        </div>
        <Button
          variant="green"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showForm ? 'Cancel' : 'Add Course'}
        </Button>
      </div>

      {/* Add Course Form */}
      {showForm && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add a Course</CardTitle>
            <CardDescription>
              Share a course you&apos;ve played or recommend for the Tour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Bethpage Black"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Farmingdale"
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. NY"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Holes</Label>
                <select
                  value={form.holes}
                  onChange={(e) => setForm({ ...form, holes: Number(e.target.value) as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                  <option value={27}>27</option>
                  <option value={36}>36</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Green Fee (Low)</Label>
                <Input
                  type="number"
                  value={form.greenFeeMin}
                  onChange={(e) => setForm({ ...form, greenFeeMin: e.target.value })}
                  placeholder="$35"
                />
              </div>
              <div className="space-y-2">
                <Label>Green Fee (High)</Label>
                <Input
                  type="number"
                  value={form.greenFeeMax}
                  onChange={(e) => setForm({ ...form, greenFeeMax: e.target.value })}
                  placeholder="$75"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Course Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.courseRating}
                  onChange={(e) => setForm({ ...form, courseRating: e.target.value })}
                  placeholder="72.4"
                />
              </div>
              <div className="space-y-2">
                <Label>Slope Rating</Label>
                <Input
                  type="number"
                  value={form.slopeRating}
                  onChange={(e) => setForm({ ...form, slopeRating: e.target.value })}
                  placeholder="135"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Book Tee Times URL</Label>
              <Input
                value={form.bookingUrl}
                onChange={(e) => setForm({ ...form, bookingUrl: e.target.value })}
                placeholder="https://golfnow.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Walking allowed? Cart included? Best time to play?"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={300}
              />
            </div>

            <Button
              variant="green"
              onClick={handleAdd}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Adding...' : 'Add Course'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showFavoritesOnly ? 'green' : 'outline'}
          size="icon"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          title="Show favorites only"
        >
          <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Course List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {search || showFavoritesOnly
              ? 'No courses match your search'
              : 'No courses added yet. Be the first!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => {
            const isFav = course.favoritedBy?.includes(user?.uid ?? '')
            const isOwner = course.addedByUid === user?.uid
            const isAdmin = profile?.isAdmin

            return (
              <Card key={course.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Name & location */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{course.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {course.holes}H
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {course.city}, {course.state}
                      </p>

                      {/* Pricing */}
                      {(course.greenFeeMin > 0 || course.greenFeeMax > 0) && (
                        <div className="flex items-center gap-1 text-sm mb-2">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" />
                          <span className="font-medium text-green-700">
                            {course.greenFeeMin > 0 && course.greenFeeMax > 0
                              ? `$${course.greenFeeMin}–$${course.greenFeeMax}`
                              : course.greenFeeMax > 0
                              ? `Up to $${course.greenFeeMax}`
                              : `From $${course.greenFeeMin}`}
                          </span>
                          <span className="text-xs text-muted-foreground">green fee</span>
                        </div>
                      )}

                      {/* Rating & Slope */}
                      {(course.courseRating || course.slopeRating) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          {course.courseRating && <span>Rating: {course.courseRating}</span>}
                          {course.slopeRating && <span>Slope: {course.slopeRating}</span>}
                        </div>
                      )}

                      {/* Notes */}
                      {course.notes && (
                        <p className="text-xs text-muted-foreground italic mb-2">
                          &ldquo;{course.notes}&rdquo;
                        </p>
                      )}

                      {/* Links & meta */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {course.bookingUrl && (
                          <a
                            href={course.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Book Tee Time
                          </a>
                        )}
                        {course.websiteUrl && (
                          <a
                            href={course.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Added by {course.addedByName}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleFavorite(course.id, isFav)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            isFav
                              ? 'text-red-500 fill-red-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {course.favoritedBy?.length ?? 0}
                      </span>
                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
