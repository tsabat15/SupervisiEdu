'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { reviewRmp, type ReviewDecision } from '@/src/app/dashboard/kepsek/rmp/actions'
import { ADMIN_CEKLIS_ITEMS, ADMIN_CEKLIS_TOTAL } from '@/src/lib/rmp-ceklis'

interface Props {
  rmpId: string
  currentStatus: 'submitted' | 'revision' | 'approved'
  initialCatatan: string
  initialCeklis: string[]
}

export default function RmpReviewPanel({
  rmpId,
  currentStatus,
  initialCatatan,
  initialCeklis,
}: Props) {
  const router = useRouter()
  const [catatan, setCatatan] = useState(initialCatatan)
  const [ceklis, setCeklis] = useState<string[]>(initialCeklis)
  const [isPending, startTransition] = useTransition()
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isApproved = currentStatus === 'approved'

  function toggleCeklis(id: string) {
    setCeklis((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit(decision: ReviewDecision) {
    setError(null)
    setPendingDecision(decision)
    startTransition(async () => {
      const result = await reviewRmp({ id: rmpId, decision, catatan, admin_ceklis: ceklis })
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
          <div className="flex items-center justify-between mb-2">
            <label className="block font-body text-sm font-semibold text-slate-700">
              Ceklis Administrasi Modul
            </label>
            <span className="font-body text-xs text-slate-400">
              {ceklis.length}/{ADMIN_CEKLIS_TOTAL}
            </span>
          </div>
          <div className="space-y-1.5">
            {ADMIN_CEKLIS_ITEMS.map((item) => {
              const checked = ceklis.includes(item.id)
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleCeklis(item.id)}
                  disabled={isPending}
                  className={`flex items-start gap-2.5 w-full text-left rounded-lg border px-3 py-2 transition disabled:opacity-50 ${
                    checked
                      ? 'border-emerald-300 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 border mt-0.5 transition ${
                      checked
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className="font-body text-xs text-slate-700 leading-snug">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

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
