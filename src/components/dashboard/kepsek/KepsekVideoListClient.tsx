'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Video as VideoIcon } from 'lucide-react'
import type { VideoStatus } from '@/src/types/database'

export interface KepsekVideoRow {
  id: string
  title: string
  subject: string
  class_name: string
  status: VideoStatus
  created_at: string
  guru_name: string | null
}

type FilterValue = 'semua' | VideoStatus

const STATUS_BADGE: Record<VideoStatus, { label: string; className: string }> = {
  belum_ditinjau: {
    label: 'Belum Ditinjau',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  sudah_ditinjau: {
    label: 'Sudah Ditinjau',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'belum_ditinjau', label: 'Belum Ditinjau' },
  { value: 'sudah_ditinjau', label: 'Sudah Ditinjau' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  rows: KepsekVideoRow[]
}

export default function KepsekVideoListClient({ rows }: Props) {
  const [filter, setFilter] = useState<FilterValue>('semua')

  const filtered = useMemo(() => {
    if (filter === 'semua') return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-md font-body text-xs font-semibold transition ${
              filter === f.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
            <VideoIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className="font-body text-sm text-slate-500">Belum ada video pada kategori ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[#002147]">
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Judul Video
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Guru
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Mapel · Kelas
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Tanggal Kirim
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Status
                </th>
                <th className="px-5 md:px-6 py-3.5 w-32" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => {
                const badge = STATUS_BADGE[v.status]
                return (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 md:px-6 py-4">
                      <p className="font-body font-medium text-slate-800">{v.title}</p>
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                      {v.guru_name ?? <span className="text-slate-400">Tidak diketahui</span>}
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-600">
                      {v.subject} · {v.class_name}
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-500 text-xs">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="px-5 md:px-6 py-4">
                      <span
                        className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 md:px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/kepsek/video/${v.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-[#002147] bg-[#D4AF37] hover:bg-[#E5C158] transition whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Tinjau
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
