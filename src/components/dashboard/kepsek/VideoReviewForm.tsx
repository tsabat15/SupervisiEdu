'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { reviewVideo } from '@/src/app/dashboard/kepsek/video/actions'
import type { VideoStatus } from '@/src/types/database'

interface Props {
  videoId: string
  currentStatus: VideoStatus
  initialKepsekNote: string
}

export default function VideoReviewForm({ videoId, currentStatus, initialKepsekNote }: Props) {
  const router = useRouter()
  const [catatan, setCatatan] = useState(initialKepsekNote)
  const [isPending, startTransition] = useTransition()
  const [pendingStatus, setPendingStatus] = useState<VideoStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function submit(status: VideoStatus) {
    setError(null)
    setPendingStatus(status)
    startTransition(async () => {
      const result = await reviewVideo({ id: videoId, status, kepsek_note: catatan })
      if (result.error) {
        setError(result.error)
        setPendingStatus(null)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 md:px-6 py-4 border-b border-slate-100">
        <h3 className="font-heading text-base font-bold text-[#002147]">Tinjauan</h3>
        <p className="font-body text-xs text-slate-500 mt-0.5">
          Tuliskan catatan dan tandai status tinjauan untuk guru.
        </p>
      </div>

      <div className="px-5 md:px-6 py-5 space-y-4">
        <div>
          <label
            htmlFor="vr-catatan"
            className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
          >
            Catatan untuk Guru
          </label>
          <textarea
            id="vr-catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            disabled={isPending}
            placeholder="Tuliskan masukan untuk guru mengenai video ini..."
            className="w-full min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition resize-y leading-relaxed"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="font-body text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
          {currentStatus === 'belum_ditinjau' ? (
            <button
              type="button"
              onClick={() => submit('sudah_ditinjau')}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending && pendingStatus === 'sudah_ditinjau' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Tandai Sudah Ditinjau
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit('belum_ditinjau')}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending && pendingStatus === 'belum_ditinjau' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Kembalikan ke Belum Ditinjau
            </button>
          )}

          {currentStatus === 'sudah_ditinjau' && (
            <button
              type="button"
              onClick={() => submit('sudah_ditinjau')}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] border border-[#002147]/20 hover:bg-[#002147]/5 disabled:opacity-50 transition"
            >
              {isPending && pendingStatus === 'sudah_ditinjau' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan Catatan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
