'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80',
    title: 'Sistem Supervisi Digital\nSMA Negeri 16 Medan',
    subtitle:
      'Platform pengelolaan supervisi pembelajaran yang transparan, terstruktur, dan berbasis data untuk kemajuan mutu pendidikan.',
  },
  {
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80',
    title: 'Pantau Kualitas\nBelajar Mengajar',
    subtitle:
      'Observasi kelas terstruktur dengan instrumen penilaian terstandar — dari pra konferensi hingga refleksi akhir.',
  },
  {
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80',
    title: 'Berkarakter, Berprestasi,\nSiap di Era Global',
    subtitle:
      'Mewujudkan visi SMA Negeri 16 Medan melalui peningkatan kompetensi guru yang berkelanjutan dan terukur.',
  },
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const goTo = useCallback((index: number) => {
    if (transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(index)
      setTransitioning(false)
    }, 300)
  }, [transitioning])

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo])

  useEffect(() => {
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next])

  const slide = slides[current]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        style={{
          backgroundImage: `url(${slide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dark overlay 40% */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div
        className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-300 ${
          transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 whitespace-pre-line">
          {slide.title}
        </h1>
        <p className="font-body text-lg text-white/85 max-w-2xl mx-auto mb-10 leading-relaxed">
          {slide.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-lg font-body font-semibold text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/30 transition-all"
          >
            Mulai Sekarang
          </Link>
          <a
            href="#tentang"
            className="px-8 py-3.5 rounded-lg font-body font-semibold text-white border border-white/50 hover:bg-white/10 transition-all"
          >
            Pelajari Lebih Lanjut
          </a>
        </div>
      </div>

      {/* Prev / Next buttons */}
      <button
        onClick={prev}
        className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Slide sebelumnya"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        aria-label="Slide berikutnya"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Pergi ke slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'bg-amber-400 w-8 h-2.5'
                : 'bg-white/50 w-2.5 h-2.5 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </section>
  )
}