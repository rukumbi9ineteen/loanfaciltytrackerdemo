import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BK Loan Facility Tracker',
  description: 'Loan Facility Expiration Tracker for Relationship Officers',
  icons: {
    icon: '/bk_logo.jpeg',
    shortcut: '/bk_logo.jpeg',
    apple: '/bk_logo.jpeg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
