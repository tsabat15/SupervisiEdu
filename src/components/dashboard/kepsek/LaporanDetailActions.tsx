'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Trash2, Undo2 } from 'lucide-react'
import {
  publishLaporan,
  unpublishLaporan,
  deleteLaporan,
} from '@/src/app/dashboard/kepsek/laporan/actions'
import type { ReportStatus } from '@/src/types/database'

interface Props {
  reportId: string
  status: ReportStatus
}

export default function LaporanDetailActions({ reportId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePublish() {
    setError(null)
    startTransition(async () => {
      const result = await publishLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleUnpublish() {
    setError(null)
    startTransition(async () => {
      const result = await unpublishLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Hapus laporan ini secara permanen?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/dashboard/kepsek/laporan')
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-body text-sm text-red-600">{error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {status === 'draft' && (
          <>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish ke Guru
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-body text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Laporan
            </button>
          </>
        )}
        {status === 'submitted' && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-body text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            Batalkan Publish
          </button>
        )}
      </div>
    </div>
  )
}
