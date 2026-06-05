'use client'

import { useEffect, useState } from 'react'
import { Maximize2, MessageSquareText, X } from 'lucide-react'
import type { RmpStatus } from '@/src/types/database'

interface Props {
  catatan: string | null
  reviewerName: string | null
  reviewedAt: string | null
  status: RmpStatus
}

function formatDateTime(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CatatanKepsekCard({
  catatan,
  reviewerName,
  reviewedAt,
  status,
}: Props) {
  const [open, setOpen] = useState(false)
  const text = catatan?.trim() ?? ''
  const hasText = text.length > 0
  const isLong = text.length > 280

  const isRevision = status === 'revision'
  const accentBg = isRevision ? 'bg-red-50/40' : 'bg-amber-50/40'
  const accentBorder = isRevision ? 'border-red-200' : 'border-amber-200'
  const accentText = isRevision ? 'text-red-700' : 'text-amber-700'

  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open])

  const reviewedAtText = formatDateTime(reviewedAt)

  return (
    <>
      <section className={`rounded-xl border ${accentBorder} ${accentBg}`}>
        <div className="px-5 md:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquareText className={`w-4 h-4 ${accentText} shrink-0`} />
            <h3 className="font-heading text-base font-bold text-[#002147] truncate">
              Catatan Kepala Sekolah
            </h3>
          </div>
          {hasText && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-body text-xs font-semibold text-slate-600 hover:bg-white hover:text-[#002147] transition shrink-0"
              title="Buka catatan dalam tampilan penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Buka Penuh
            </button>
          )}
        </div>

        <div className="px-5 md:px-6 py-4 md:py-5">
          {hasText ? (
            <div className="max-h-60 overflow-y-auto pr-1">
              <p className="font-body text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {text}
              </p>
            </div>
          ) : (
            <p className="font-body text-sm italic text-slate-500">
              Belum ada catatan tertulis dari kepala sekolah.
            </p>
          )}

          {hasText && isLong && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 font-body text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              Lihat selengkapnya
            </button>
          )}

          {(reviewerName || reviewedAtText) && (
            <p className="font-body text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/70">
              Ditinjau oleh{' '}
              <span className="font-semibold text-slate-700">
                {reviewerName ?? 'kepala sekolah'}
              </span>
              {reviewedAtText && <> · {reviewedAtText}</>}
            </p>
          )}
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4 py-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isRevision ? 'bg-red-50' : 'bg-amber-50'
                  }`}
                >
                  <MessageSquareText className={`w-4 h-4 ${accentText}`} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold text-slate-900">
                    Catatan Kepala Sekolah
                  </h2>
                  {(reviewerName || reviewedAtText) && (
                    <p className="font-body text-xs text-slate-500 mt-0.5 truncate">
                      {reviewerName ?? 'Kepala sekolah'}
                      {reviewedAtText && <> · {reviewedAtText}</>}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              <p className="font-body text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {text}
              </p>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center px-4 py-2 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
