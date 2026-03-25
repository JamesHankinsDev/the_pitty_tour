'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Eye, LogIn, X } from 'lucide-react'

export function DemoBanner() {
  const { exitDemo } = useAuth()
  const router = useRouter()

  const handleExit = () => {
    exitDemo()
    router.replace('/')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
          <Eye className="w-4 h-4 shrink-0" />
          <span>You're viewing PITY Tour in demo mode</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-100 text-xs h-7"
            onClick={handleExit}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Exit Demo
          </Button>
        </div>
      </div>
    </div>
  )
}
