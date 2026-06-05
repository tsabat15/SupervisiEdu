'use client'

import { useState } from 'react'
import { PlayCircle, X } from 'lucide-react'

// Ganti VIDEO_EMBED_URL dengan URL embed YouTube Anda
// Contoh: https://www.youtube.com/embed/xxxxxxxxxxx
const VIDEO_EMBED_URL = ''

export default function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="demo" className="bg-slate-900 py-24">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">

        <div className="text-center mb-12">
          <p className="font-body text-sm font-semibold text-amber-400 uppercase tracking-widest mb-3">
            Video Profil
          </p>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            Profil SMA Negeri 16 Medan
          </h2>
          <p className="font-body text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Kenali lebih dekat SMA Negeri 16 Medan — sekolah unggulan dengan tradisi prestasi
            akademik dan non-akademik yang membanggakan sejak 1985.
          </p>
        </div>

        {/* 16:9 container */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingTop: '56.25%' }}>

          {playing && VIDEO_EMBED_URL ? (
            <>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`${VIDEO_EMBED_URL}?autoplay=1`}
                title="Demo SupervisiEdu"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
              <button
                onClick={() => setPlaying(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Tutup video"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0">
              {/* Thumbnail */}
              <img
                src="https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=1200&q=80"
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/55" />

              {/* Play button */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <button
                  onClick={() => setPlaying(true)}
                  className="group"
                  aria-label="Putar video demo"
                >
                  <PlayCircle className="w-20 h-20 text-white group-hover:text-amber-400 drop-shadow-2xl transition-colors duration-200" />
                </button>
                <span className="font-body text-sm text-white/70">
                  Klik untuk memutar video demo
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}