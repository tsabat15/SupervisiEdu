import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Sistem Supervisi Pendidikan Terpadu',
  description:
    'Tingkatkan transparansi dan kualitas pendidikan melalui pemantauan data waktu nyata.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${playfair.variable} ${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-body bg-slate-950 text-slate-50 antialiased">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
