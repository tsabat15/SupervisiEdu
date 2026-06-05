'use client'

import { useState } from 'react'
import { Mail, MessageCircle, X, Code2 } from 'lucide-react'

const DEV = {
  name: 'Muhammad Tsabat Muhyiyuddin',
  title: 'Web Developer · Freelancer',
  tagline: 'Butuh website atau aplikasi serupa? Hubungi saya untuk konsultasi gratis.',
  wa: '62895628925599',
  email: 'izuddintsabat@gmail.com',
}

export default function DeveloperCard() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating Badge */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#002147] text-white shadow-lg shadow-[#002147]/40 hover:bg-[#002f63] hover:shadow-xl hover:shadow-[#002147]/50 transition-all duration-200 group"
        aria-label="Kartu nama developer"
      >
        <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-body text-xs font-semibold whitespace-nowrap">
          Built by <span className="text-amber-400">Tsabat</span>
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Card */}
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header strip */}
            <div className="bg-[#002147] px-6 pt-6 pb-10">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center shadow-lg mb-4">
                <span className="font-heading text-xl font-bold text-[#002147]">MT</span>
              </div>
              <h2 className="font-heading text-lg font-bold text-white leading-snug">
                {DEV.name}
              </h2>
              <p className="font-body text-xs text-amber-400 mt-1 font-semibold">{DEV.title}</p>
            </div>

            {/* Body */}
            <div className="px-6 pt-5 pb-6 -mt-5 bg-white rounded-t-2xl relative">
              <p className="font-body text-sm text-slate-500 leading-relaxed mb-6">
                {DEV.tagline}
              </p>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/${DEV.wa}?text=Halo%20Tsabat%2C%20saya%20tertarik%20dengan%20jasa%20pembuatan%20website%20Anda.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-emerald-500 text-white font-body text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-100"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  Chat via WhatsApp
                  <span className="ml-auto font-normal text-emerald-100 text-xs">
                    {DEV.wa.replace('62', '0').replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3')}
                  </span>
                </a>

                <a
                  href={`mailto:${DEV.email}`}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-body text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0 text-slate-500" />
                  Kirim Email
                  <span className="ml-auto font-normal text-slate-400 text-xs truncate max-w-[140px]">
                    {DEV.email}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
