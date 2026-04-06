'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto text-center space-y-4">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="text-lg font-bold">Admin page error</h2>
      <p className="text-muted-foreground text-sm">
        Something went wrong loading this page.
      </p>
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
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Admin Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
