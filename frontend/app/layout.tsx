import type { Metadata } from 'next'
import { Geist, Geist_Mono, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/AuthContext'
import { GlobalAurora } from '@/components/GlobalAurora'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600']
});
const geistMono = Geist_Mono({ subsets: ["latin"] });
const dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ['700'],
  variable: '--font-dm-sans'
});

export const metadata: Metadata = {
  title: 'Debately - Build Understanding Through Structured Debate',
  description: 'Create topics, contribute arguments, let AI synthesize understanding. The resilient platform for structured discourse.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${dmSans.variable} antialiased`}>
        <AuthProvider>
          <GlobalAurora>
            {children}
          </GlobalAurora>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
