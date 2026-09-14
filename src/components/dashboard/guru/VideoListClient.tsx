'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Video as VideoIcon } from 'lucide-react'
import type { VideoStatus } from '@/src/types/database'

export interface VideoRow {
  id: string
  title: string
  subject: string
  class_name: string
  status: VideoStatus
  created_at: string
}

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  rows: VideoRow[]
}

export default function VideoListClient({ rows }: Props) {
  const router = useRouter()

  if (rows.length === 0) {
    return <EmptyState />
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map((v) => {
        const badge = STATUS_BADGE[v.status]
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/guru/video/${v.id}`)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-amber-300 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body font-semibold text-slate-900 truncate">{v.title}</p>
                  <p className="font-body text-xs text-slate-500 mt-1">
                    {v.subject} · {v.class_name}
                  </p>
                  <p className="font-body text-xs text-slate-400 mt-1">{formatDate(v.created_at)}</p>
                </div>
                <span
                  className={`inline-block font-body text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-4">
        <VideoIcon className="w-6 h-6 text-[#D4AF37]" />
      </div>
      <h2 className="font-heading text-lg font-bold text-slate-800 mb-1">
        Belum ada video yang dikirim
      </h2>
      <p className="font-body text-sm text-slate-500 max-w-sm mx-auto">
        Kirim video rekaman mengajar Anda agar dapat ditinjau oleh kepala sekolah.
      </p>
      <Link
        href="/dashboard/guru/video/buat"
        className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 transition"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Kirim Video Baru
      </Link>
    </div>
  )
}
