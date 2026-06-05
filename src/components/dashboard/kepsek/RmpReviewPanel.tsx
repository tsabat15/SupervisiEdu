'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { reviewRmp, type ReviewDecision } from '@/src/app/dashboard/kepsek/rmp/actions'

interface Props {
  rmpId: string
  currentStatus: 'submitted' | 'revision' | 'approved'
  initialCatatan: string
}

export default function RmpReviewPanel({ rmpId, currentStatus, initialCatatan }: Props) {
  const router = useRouter()
  const [catatan, setCatatan] = useState(initialCatatan)
  const [isPending, startTransition] = useTransition()
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isApproved = currentStatus === 'approved'

  function submit(decision: ReviewDecision) {
    setError(null)
    setPendingDecision(decision)
    startTransition(async () => {
      const result = await reviewRmp({ id: rmpId, decision, catatan })
      if (result.error) {
        setError(result.error)
        setPendingDecision(null)
        return
      }
      router.push('/dashboard/kepsek/rmp')
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 md:px-6 py-4 border-b border-slate-100">
        <h3 className="font-heading text-base font-bold text-[#002147]">Panel Penilaian</h3>
        <p className="font-body text-xs text-slate-500 mt-0.5">
          Berikan keputusan dan masukan untuk guru.
        </p>
      </div>

      <div className="px-5 md:px-6 py-5 space-y-4">
        {isApproved && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <p className="font-body text-xs text-emerald-700">
              RMP ini sudah disetujui. Anda masih dapat menambah catatan atau mengembalikan ke
              status revisi.
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="catatan"
            className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
          >
            Catatan / Masukan (Feedback)
          </label>
          <textarea
            id="catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            disabled={isPending}
            placeholder="Tuliskan masukan untuk guru. Wajib diisi jika mengembalikan untuk revisi."
            className="w-full min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition resize-y leading-relaxed"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="font-body text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={() => submit('revision')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
          >
            {isPending && pendingDecision === 'revision' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Kembalikan untuk Revisi
          </button>

          <button
            type="button"
            onClick={() => submit('approved')}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            {isPending && pendingDecision === 'approved' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Setujui RMP
          </button>
        </div>
      </div>
    </div>
  )
}
