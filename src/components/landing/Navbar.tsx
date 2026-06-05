'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const navLinks = [
  { label: 'Tentang', href: '#tentang' },
  { label: 'Fitur', href: '#fitur' },
  { label: 'Berita', href: '#berita' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <Link
          href="/"
          className={`font-heading text-xl font-bold tracking-wide transition-colors ${
            scrolled ? 'text-slate-900' : 'text-white'
          }`}
        >
          SupervisiEdu
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={`font-body text-sm font-medium transition-colors ${
                scrolled
                  ? 'text-slate-600 hover:text-amber-600'
                  : 'text-white/90 hover:text-amber-300'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <Link
          href="/login"
          className="font-body text-sm font-semibold px-5 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-400 shadow-md transition-all"
        >
          Masuk
        </Link>
      </div>
    </nav>
  )
}