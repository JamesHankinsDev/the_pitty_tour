'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

/**
 * Dashboard error boundary — catches crashes in any dashboard page
 * while keeping the sidebar/nav intact.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto">
      <Card className="border-red-200">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mt-1">
              This page ran into an error. Your data is safe.
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && error.message && (
            <pre className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="green" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
