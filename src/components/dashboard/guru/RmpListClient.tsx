'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Clock, Loader2, MailQuestion, Plus, Trash2, X } from 'lucide-react'
import { deleteRmp, requestRmpDeletion } from '@/src/app/dashboard/guru/rmp/actions'
import RmpPdfDownloadButton from '@/src/components/dashboard/RmpPdfDownloadButton'
import type { RmpForm, RmpStatus } from '@/src/types/database'

export type RmpRow = Pick<RmpForm, 'id' | 'judul' | 'tema' | 'status' | 'created_at'> & {
  has_pending_deletion: boolean
}

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  revision: { label: 'Revisi', className: 'bg-red-50 text-red-700 border border-red-200' },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  rows: RmpRow[]
}

export default function RmpListClient({ rows }: Props) {
  const router = useRouter()
  const [confirmTarget, setConfirmTarget] = useState<RmpRow | null>(null)
  const [requestTarget, setRequestTarget] = useState<RmpRow | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function handleDelete() {
    if (!confirmTarget) return
    const target = confirmTarget
    startTransition(async () => {
      const result = await deleteRmp(target.id)
      if (result.error) {
        setToast({ type: 'error', msg: result.error })
      } else {
        setToast({ type: 'success', msg: `Draft "${target.judul || 'Tanpa Judul'}" dihapus.` })
        router.refresh()
      }
      setConfirmTarget(null)
    })
  }

  function openRequestModal(target: RmpRow) {
    setRequestTarget(target)
    setRequestReason('')
    setRequestError(null)
  }

  function handleRequestSubmit() {
    if (!requestTarget) return
    const target = requestTarget
    const reason = requestReason
    setRequestError(null)
    startTransition(async () => {
      const result = await requestRmpDeletion(target.id, reason)
      if (result.error) {
        setRequestError(result.error)
        return
      }
      setRequestTarget(null)
      setRequestReason('')
      setToast({
        type: 'success',
        msg: `Permintaan hapus untuk "${target.judul || 'Tanpa Judul'}" diajukan.`,
      })
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return <EmptyState />
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-[#002147]">
              <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                Judul Projek
              </th>
              <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                Tema
              </th>
              <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                Tanggal Dibuat
              </th>
              <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                Status
              </th>
              <th className="px-5 md:px-6 py-3.5 w-12" aria-label="Aksi" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((rmp) => {
              const badge = STATUS_BADGE[rmp.status] ?? STATUS_BADGE.draft
              const canDelete = rmp.status === 'draft'
              const canDownload = rmp.status === 'approved'
              const canRequest =
                rmp.status !== 'draft' && !rmp.has_pending_deletion
              const hasPending = rmp.has_pending_deletion
              return (
                <tr
                  key={rmp.id}
                  onClick={() => router.push(`/dashboard/guru/rmp/${rmp.id}`)}
                  className="cursor-pointer hover:bg-amber-50/40 transition-colors"
                >
                  <td className="px-5 md:px-6 py-4">
                    <p className="font-body font-medium text-slate-800">
                      {rmp.judul || (
                        <span className="italic text-slate-400">Tanpa Judul</span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 md:px-6 py-4 font-body text-slate-600">
                    {rmp.tema || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 md:px-6 py-4 font-body text-slate-500 text-xs">
                    {formatDate(rmp.created_at)}
                  </td>
                  <td className="px-5 md:px-6 py-4">
                    <span
                      className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td
                    className="px-5 md:px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {canDownload && (
                        <RmpPdfDownloadButton
                          rmpId={rmp.id}
                          judul={rmp.judul || 'RMP'}
                          variant="pill"
                        />
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(rmp)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-colors"
                          aria-label={`Hapus draft ${rmp.judul || 'Tanpa Judul'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPending && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap"
                          title="Permintaan hapus sedang menunggu persetujuan admin"
                        >
                          <Clock className="w-3 h-3" />
                          Permintaan diajukan
                        </span>
                      )}
                      {canRequest && (
                        <button
                          type="button"
                          onClick={() => openRequestModal(rmp)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-body text-[11px] font-semibold text-orange-700 border border-orange-200 hover:bg-orange-50 disabled:opacity-50 transition whitespace-nowrap"
                          title="Ajukan permintaan hapus ke admin"
                        >
                          <MailQuestion className="w-3.5 h-3.5" />
                          Minta Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {confirmTarget && (
        <ConfirmModal
          target={confirmTarget}
          isPending={isPending}
          onCancel={() => !isPending && setConfirmTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {requestTarget && (
        <RequestModal
          target={requestTarget}
          reason={requestReason}
          error={requestError}
          isPending={isPending}
          onChangeReason={setRequestReason}
          onCancel={() => {
            if (isPending) return
            setRequestTarget(null)
            setRequestReason('')
            setRequestError(null)
          }}
          onSubmit={handleRequestSubmit}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border font-body text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-700'
              : 'bg-white border-red-200 text-red-600'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {toast.msg}
        </div>
      )}
    </>
  )
}

function ConfirmModal({
  target,
  isPending,
  onCancel,
  onConfirm,
}: {
  target: RmpRow
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Hapus Draft?</h2>
            <p className="font-body text-xs text-slate-500 mt-0.5">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="font-body text-sm text-slate-700 leading-relaxed">
            Draft{' '}
            <span className="font-semibold text-[#002147]">
              {target.judul || 'Tanpa Judul'}
            </span>{' '}
            akan dihapus permanen.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2.5 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Hapus Draft
          </button>
        </div>
      </div>
    </div>
  )
}

function RequestModal({
  target,
  reason,
  error,
  isPending,
  onChangeReason,
  onCancel,
  onSubmit,
}: {
  target: RmpRow
  reason: string
  error: string | null
  isPending: boolean
  onChangeReason: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Ajukan Permintaan Hapus
            </h2>
            <p className="font-body text-xs text-slate-500 mt-0.5">
              Admin akan meninjau permintaan ini sebelum modul dihapus.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="font-body text-sm text-slate-700 leading-relaxed">
            Modul{' '}
            <span className="font-semibold text-[#002147]">
              {target.judul || 'Tanpa Judul'}
            </span>{' '}
            akan diajukan untuk dihapus.
          </p>

          <div>
            <label
              htmlFor="deletion-reason"
              className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
            >
              Alasan penghapusan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Contoh: salah input data, duplikat dengan modul lain, dll."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 transition resize-y"
            />
            <p className="mt-1 font-body text-xs text-slate-400">
              Minimal 5 karakter.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="font-body text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2.5 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MailQuestion className="w-4 h-4" />
            )}
            Ajukan
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-4">
        <BookOpen className="w-6 h-6 text-[#D4AF37]" />
      </div>
      <h2 className="font-heading text-lg font-bold text-slate-800 mb-1">
        Belum ada modul yang dibuat
      </h2>
      <p className="font-body text-sm text-slate-500 max-w-sm mx-auto">
        Mulai susun Rencana Modul Projek pertama Anda. Anda dapat menyimpannya sebagai draft kapan saja.
      </p>
      <Link
        href="/dashboard/guru/rmp/buat"
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 transition"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Buat RMP Baru
      </Link>
    </div>
  )
}
