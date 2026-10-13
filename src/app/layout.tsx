import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Security Quiz - ΕΟΠΠΕΠ/ΚΕΜΕΑ',
  description: 'Πλατφόρμα προετοιμασίας για εξετάσεις Security με Προσομοιώσεις.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}