'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus, FileText } from 'lucide-react'
import type { ReportStatus } from '@/src/types/database'

const INSTRUMENT_SHORT: Record<string, string> = {
  pelaksanaan: 'Pelaksanaan',
  administrasi: 'Administrasi',
  modul_ajar: 'Modul Ajar',
}

function getPredikat(score: number): string {
  if (score >= 91) return 'SB'
  if (score >= 76) return 'B'
  if (score >= 61) return 'C'
  return 'K'
}

interface LaporanRow {
  id: string
  teacher_name: string | null
  subject: string
  class_name: string
  visit_date: string
  score: number | null
  status: ReportStatus
  instrument_type: string
}

interface Props {
  initialReports: LaporanRow[]
}

type FilterValue = 'semua' | ReportStatus

const STATUS_BADGE: Record<ReportStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  approved: { label: 'Approved', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Published' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="font-body text-xs text-slate-400">—</span>
  }
  const predikat = getPredikat(score)
  const cls =
    predikat === 'SB'
      ? 'bg-emerald-50 text-emerald-700'
      : predikat === 'B'
      ? 'bg-blue-50 text-blue-700'
      : predikat === 'C'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-block font-body text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {score} <span className="opacity-70">({predikat})</span>
    </span>
  )
}

export default function KepsekLaporanClient({ initialReports }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValue>('semua')

  const filtered = useMemo(() => {
    if (filter === 'semua') return initialReports
    return initialReports.filter((r) => r.status === filter)
  }, [initialReports, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

        <button
          type="button"
          onClick={() => router.push('/dashboard/kepsek/laporan/buat')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition shadow-sm"
        >
          <FilePlus className="w-4 h-4" />
          Buat Laporan
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="font-body text-sm text-slate-500">Belum ada laporan supervisi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-[#002147]">
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Guru</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Mata Pelajaran</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Kelas</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Tanggal</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Jenis</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Nilai</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const badge = STATUS_BADGE[r.status]
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/dashboard/kepsek/laporan/${r.id}`)}
                    className="hover:bg-slate-50/60 transition cursor-pointer"
                  >
                    <td className="px-5 md:px-6 py-4 font-body font-medium text-slate-800">
                      {r.teacher_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{r.subject}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{r.class_name}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-600">{formatDate(r.visit_date)}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-600 text-xs">
                      {INSTRUMENT_SHORT[r.instrument_type] ?? 'Pelaksanaan'}
                    </td>
                    <td className="px-5 md:px-6 py-4">
                      <ScoreBadge score={r.score} />
                    </td>
                    <td className="px-5 md:px-6 py-4">
                      <span
                        className={`inline-block font-body text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
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
