'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  createLaporan,
  updateLaporan,
  type LaporanPayload,
} from '@/src/app/dashboard/kepsek/laporan/actions'
import type { SupervisionReport } from '@/src/types/database'

interface GuruOption {
  id: string
  full_name: string
}

interface JadwalOption {
  id: string
  label: string
}

interface Props {
  mode: 'create' | 'edit'
  initialData?: SupervisionReport
  guruOptions: GuruOption[]
  jadwalOptions: JadwalOption[]
}

export default function LaporanForm({ mode, initialData, guruOptions, jadwalOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [teacherId, setTeacherId] = useState(initialData?.teacher_id ?? '')
  const [visitDate, setVisitDate] = useState(
    initialData?.visit_date ?? new Date().toISOString().slice(0, 10),
  )
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [className, setClassName] = useState(initialData?.class_name ?? '')
  const [strengths, setStrengths] = useState(initialData?.strengths ?? '')
  const [improvements, setImprovements] = useState(initialData?.improvements ?? '')
  const [recommendations, setRecommendations] = useState(initialData?.recommendations ?? '')
  const [scoreStr, setScoreStr] = useState(initialData?.score?.toString() ?? '')
  const [scheduleId, setScheduleId] = useState(initialData?.schedule_id ?? '')

  function buildPayload(): LaporanPayload {
    const parsedScore = scoreStr.trim() !== '' ? parseInt(scoreStr, 10) : null
    return {
      teacher_id: teacherId,
      visit_date: visitDate,
      subject,
      class_name: className,
      strengths: strengths.trim() || null,
      improvements: improvements.trim() || null,
      recommendations: recommendations.trim() || null,
      score: parsedScore,
      schedule_id: scheduleId || null,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createLaporan(buildPayload())
        if (result.error) {
          setError(result.error)
          return
        }
        router.push(`/dashboard/kepsek/laporan/${result.id}`)
      } else {
        const result = await updateLaporan({ ...buildPayload(), id: initialData!.id })
        if (result.error) {
          setError(result.error)
          return
        }
        setSuccess(true)
      }
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition'
  const labelCls = 'block font-body text-sm font-medium text-slate-700 mb-1'
  const textareaCls = inputCls + ' resize-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="font-body text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="font-body text-sm text-emerald-700">Laporan berhasil disimpan.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Guru <span className="text-red-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">-- Pilih Guru --</option>
            {guruOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Tanggal Kunjungan <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Matematika"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Kelas <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: X-A"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Nilai (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreStr}
            onChange={(e) => setScoreStr(e.target.value)}
            placeholder="Opsional"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Hubungkan ke Jadwal (opsional)</label>
          <select
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className={inputCls}
          >
            <option value="">-- Tidak dihubungkan --</option>
            {jadwalOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Kekuatan yang Diamati</label>
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          rows={3}
          placeholder="Hal-hal positif yang ditemukan selama observasi..."
          className={textareaCls}
        />
      </div>

      <div>
        <label className={labelCls}>Area yang Perlu Ditingkatkan</label>
        <textarea
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          rows={3}
          placeholder="Aspek yang masih perlu diperbaiki..."
          className={textareaCls}
        />
      </div>

      <div>
        <label className={labelCls}>Rekomendasi</label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={3}
          placeholder="Saran tindak lanjut untuk guru..."
          className={textareaCls}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || !teacherId || !visitDate || !subject.trim() || !className.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Draft
        </button>
      </div>
    </form>
  )
}
