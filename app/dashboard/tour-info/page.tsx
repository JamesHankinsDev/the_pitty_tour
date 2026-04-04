'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Info } from 'lucide-react'

// Lazy-load the content from existing page components
import AnnouncementsContent from './AnnouncementsContent'
import OfficersContent from './OfficersContent'

export const dynamic = 'force-dynamic'

export default function TourInfoPage() {
  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Info className="w-6 h-6 text-green-600" />
          Tour Info
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Announcements and officer directory
        </p>
      </div>

      <Tabs defaultValue="announcements">
        <TabsList className="w-full">
          <TabsTrigger value="announcements" className="flex-1">
            Announcements
          </TabsTrigger>
          <TabsTrigger value="officers" className="flex-1">
            Officers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsContent />
        </TabsContent>

        <TabsContent value="officers" className="mt-4">
          <OfficersContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
