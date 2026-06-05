'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MailQuestion,
  Trash2,
  X,
} from 'lucide-react'
import {
  adminDeleteRmp,
  approveDeletionRequest,
  rejectDeletionRequest,
} from '@/src/app/dashboard/admin/rmp/actions'
import type { RmpStatus } from '@/src/types/database'

export interface AdminRmpRow {
  id: string
  judul: string
  tema: string
  status: RmpStatus
  guru_id: string
  guru_name: string | null
  created_at: string
  updated_at: string
}

export interface DeletionReqRow {
  id: string
  rmp_id: string
  guru_id: string
  guru_name: string | null
  judul: string
  reason: string
  created_at: string
}

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: {
    label: 'Menunggu Review',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Disetujui',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
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
  rmps: AdminRmpRow[]
  requests: DeletionReqRow[]
  pendingByRmp: Record<string, string>
}

export default function AdminRmpClient({ rmps, requests, pendingByRmp }: Props) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<AdminRmpRow | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DeletionReqRow | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function handleAdminDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    startTransition(async () => {
      const result = await adminDeleteRmp(target.id)
      if (result.error) {
        setToast({ type: 'error', msg: result.error })
      } else {
        setToast({ type: 'success', msg: `Modul "${target.judul || 'Tanpa Judul'}" dihapus.` })
        router.refresh()
      }
      setDeleteTarget(null)
    })
  }

  function handleApprove(req: DeletionReqRow) {
    if (!confirm(`Setujui hapus modul "${req.judul || 'Tanpa Judul'}"?`)) return
    startTransition(async () => {
      const result = await approveDeletionRequest(req.id)
      if (result.error) {
        setToast({ type: 'error', msg: result.error })
      } else {
        setToast({
          type: 'success',
          msg: `Permintaan disetujui — "${req.judul || 'Tanpa Judul'}" dihapus.`,
        })
        router.refresh()
      }
    })
  }

  function handleReject() {
    if (!rejectTarget) return
    const target = rejectTarget
    startTransition(async () => {
      const result = await rejectDeletionRequest(target.id, rejectNote)
      if (result.error) {
        setToast({ type: 'error', msg: result.error })
      } else {
        setToast({
          type: 'success',
          msg: `Permintaan ditolak.`,
        })
        router.refresh()
      }
      setRejectTarget(null)
      setRejectNote('')
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MailQuestion className="w-4 h-4 text-orange-500" />
              <h2 className="font-heading text-base font-bold text-slate-900">
                Permintaan Hapus dari Guru
              </h2>
            </div>
            <p className="font-body text-xs text-slate-500 mt-0.5">
              {requests.length === 0
                ? 'Tidak ada permintaan menunggu.'
                : `${requests.length} permintaan menunggu persetujuan.`}
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-body text-sm text-slate-500">
              Belum ada permintaan hapus dari guru.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((req) => (
              <li key={req.id} className="px-5 md:px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-semibold text-slate-900">
                      {req.judul || 'Tanpa Judul'}
                    </p>
                    <p className="font-body text-xs text-slate-500 mt-0.5">
                      Oleh{' '}
                      <span className="font-medium text-slate-700">
                        {req.guru_name ?? 'Tidak diketahui'}
                      </span>{' '}
                      · {formatDate(req.created_at)}
                    </p>
                    <div className="mt-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                      <p className="font-body text-[11px] font-semibold text-orange-700 mb-0.5">
                        Alasan:
                      </p>
                      <p className="font-body text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">
                        {req.reason || '(tidak ada alasan)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRejectTarget(req)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(req)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Setujui & Hapus
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100">
          <h2 className="font-heading text-base font-bold text-slate-900">Semua RMP</h2>
          <p className="font-body text-xs text-slate-500 mt-0.5">
            {rmps.length} modul terdaftar dari semua guru.
          </p>
        </div>

        {rmps.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-body text-sm text-slate-500">Belum ada modul terdaftar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-[#002147]">
                  <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                    Judul
                  </th>
                  <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                    Guru
                  </th>
                  <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                    Status
                  </th>
                  <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                    Dibuat
                  </th>
                  <th className="px-5 md:px-6 py-3.5 w-32" aria-label="Aksi" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rmps.map((r) => {
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.draft
                  const hasPending = !!pendingByRmp[r.id]
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 md:px-6 py-4">
                        <p className="font-body font-medium text-slate-800">
                          {r.judul || <span className="italic text-slate-400">Tanpa Judul</span>}
                        </p>
                        {r.tema && (
                          <p className="font-body text-[11px] text-slate-500 mt-0.5">{r.tema}</p>
                        )}
                      </td>
                      <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                        {r.guru_name ?? <span className="text-slate-400">Tidak diketahui</span>}
                      </td>
                      <td className="px-5 md:px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {hasPending && (
                            <span
                              title="Ada permintaan hapus menunggu"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              Hapus diminta
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 md:px-6 py-4 font-body text-slate-500 text-xs">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-5 md:px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          isPending={isPending}
          onCancel={() => !isPending && setDeleteTarget(null)}
          onConfirm={handleAdminDelete}
        />
      )}

      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          note={rejectNote}
          isPending={isPending}
          onChangeNote={setRejectNote}
          onCancel={() => {
            if (isPending) return
            setRejectTarget(null)
            setRejectNote('')
          }}
          onSubmit={handleReject}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-20 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border font-body text-sm font-medium ${
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
    </div>
  )
}

function ConfirmDeleteModal({
  target,
  isPending,
  onCancel,
  onConfirm,
}: {
  target: AdminRmpRow
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Hapus Modul?</h2>
              <p className="font-body text-xs text-slate-500 mt-0.5">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
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
            Modul{' '}
            <span className="font-semibold text-[#002147]">
              {target.judul || 'Tanpa Judul'}
            </span>{' '}
            milik {target.guru_name ?? 'guru'} akan dihapus permanen. Guru akan menerima
            notifikasi.
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
            Hapus Modul
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({
  target,
  note,
  isPending,
  onChangeNote,
  onCancel,
  onSubmit,
}: {
  target: DeletionReqRow
  note: string
  isPending: boolean
  onChangeNote: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Tolak Permintaan</h2>
            <p className="font-body text-xs text-slate-500 mt-0.5">
              Berikan alasan agar guru paham.
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
            Permintaan hapus modul{' '}
            <span className="font-semibold text-[#002147]">
              {target.judul || 'Tanpa Judul'}
            </span>{' '}
            akan ditolak.
          </p>
          <div>
            <label
              htmlFor="admin-note"
              className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
            >
              Catatan (opsional)
            </label>
            <textarea
              id="admin-note"
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Contoh: modul sudah disetujui dan menjadi arsip kurikulum."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 transition resize-y"
            />
          </div>
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Tolak Permintaan
          </button>
        </div>
      </div>
    </div>
  )
}
