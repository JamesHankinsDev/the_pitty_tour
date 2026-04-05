import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'
import { IOSInstallBanner } from '@/components/pwa/IOSInstallBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PITY Tour — Players\' Invitational Tour Yearly',
  description: 'Amateur golf league management platform for the PITY Tour',
  applicationName: 'PITY Tour',
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
