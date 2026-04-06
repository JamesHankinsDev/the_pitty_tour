import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'
import { IOSInstallBanner } from '@/components/pwa/IOSInstallBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://the-pity-tour.web.app'),
  title: 'PITY Tour — Players\' Invitational Tour Yearly',
  description: 'A season-long amateur golf league with real prize pools, monthly majors, handicap scoring, and a points race to crown the Tour Champion.',
  applicationName: 'PITY Tour',
  openGraph: {
    title: 'PITY Tour',
    description: 'A season-long amateur golf league with real prize pools, monthly majors, and a points race to crown the Tour Champion.',
    siteName: 'PITY Tour',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PITY Tour',
    description: 'A season-long amateur golf league with real prize pools, monthly majors, and a points race to crown the Tour Champion.',
  },
  appleWebApp: {
    capable: true,
    title: 'PITY Tour',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16a34a',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegister />
          <IOSInstallBanner />
        </AuthProvider>
      </body>
    </html>
  )
}
