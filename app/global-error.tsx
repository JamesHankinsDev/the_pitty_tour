'use client'

/**
 * Global error boundary — catches errors in the root layout itself.
 * This is the last line of defense; it renders its own <html> since
 * the root layout may have been the thing that crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-green-950 text-white p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-green-800 font-black text-2xl">P</span>
          </div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-green-200 text-sm">
            An unexpected error occurred. This has been logged.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-white text-green-800 font-semibold rounded-lg text-sm hover:bg-green-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
