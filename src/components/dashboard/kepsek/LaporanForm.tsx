'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  createLaporan,
  updateLaporan,
  type LaporanPayload,
  type InstrumentType,
} from '@/src/app/dashboard/kepsek/laporan/actions'
import type { SupervisionReport } from '@/src/types/database'
import {
  SECTIONS,
  REKAPITULASI,
  MAX_TOTAL,
  getPredikat,
} from '@/src/lib/laporan-rubrik'

interface GuruOption {
  id: string
  full_name: string
  nip?: string | null
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
  supervisorName?: string
}

type ObsScores = Record<number, number>

// Map predikat to Tailwind badge classes for the form UI
function getPredikatCls(na: number): string {
  if (na >= 91) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (na >= 76) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (na >= 61) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ letter }: { letter: string }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#002147] text-white font-body text-xs font-bold shrink-0">
      {letter}
    </span>
  )
}

function ScoreButton({
  value,
  selected,
  onClick,
}: {
  value: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 rounded-lg font-body text-sm font-bold transition-all ${
        selected
          ? 'bg-[#002147] text-white shadow-sm'
          : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50'
      }`}
    >
      {value}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LaporanForm({
  mode,
  initialData,
  guruOptions,
  jadwalOptions,
  supervisorName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Identitas
  const [teacherId, setTeacherId] = useState(initialData?.teacher_id ?? '')
  const [visitDate, setVisitDate] = useState(
    initialData?.visit_date ?? new Date().toISOString().slice(0, 10),
  )
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [className, setClassName] = useState(initialData?.class_name ?? '')
  const [jamKe, setJamKe] = useState(initialData?.jam_ke ?? '')
  const [materi, setMateri] = useState(initialData?.materi ?? '')
  const [scheduleId, setScheduleId] = useState(initialData?.schedule_id ?? '')
  const [instrumentType, setInstrumentType] = useState<InstrumentType>(
    (initialData?.instrument_type as InstrumentType) ?? 'pelaksanaan',
  )

  // Rubric scores — convert string keys back to number keys
  const initialObsScores = useMemo<ObsScores>(() => {
    const raw = initialData?.observation_scores
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const parsed: ObsScores = {}
    for (const [k, v] of Object.entries(raw as Record<string, number>)) {
      const n = parseInt(k)
      if (!isNaN(n) && v >= 1 && v <= 4) parsed[n] = v
    }
    return parsed
  }, [initialData])

  const [obsScores, setObsScores] = useState<ObsScores>(initialObsScores)

  // Manual score (non-pelaksanaan)
  const [scoreStr, setScoreStr] = useState(initialData?.score?.toString() ?? '')

  const selectedGuru = guruOptions.find((g) => g.id === teacherId)
  const isPelaksanaan = instrumentType === 'pelaksanaan'

  // Per-section sums
  const sectionSums = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const section of SECTIONS) {
      result[section.id] = section.items.reduce((sum, item) => sum + (obsScores[item.no] ?? 0), 0)
    }
    return result
  }, [obsScores])

  const totalObsScore = useMemo(
    () => Object.values(sectionSums).reduce((a, b) => a + b, 0),
    [sectionSums],
  )

  const nilaiAkhir = useMemo(
    () => (totalObsScore > 0 ? Math.round((totalObsScore / MAX_TOTAL) * 10000) / 100 : null),
    [totalObsScore],
  )

  function toggleItemScore(itemNo: number, score: number) {
    setObsScores((prev) => ({
      ...prev,
      [itemNo]: prev[itemNo] === score ? 0 : score,
    }))
  }

  function buildPayload(): LaporanPayload {
    const calcScore = isPelaksanaan
      ? nilaiAkhir
      : scoreStr.trim() !== ''
      ? Number(scoreStr)
      : null

    const obsScoresForSave =
      isPelaksanaan && Object.values(obsScores).some((v) => v > 0)
        ? Object.fromEntries(Object.entries(obsScores).map(([k, v]) => [k, v]))
        : null

    return {
      teacher_id: teacherId,
      visit_date: visitDate,
      subject,
      class_name: className,
      jam_ke: jamKe.trim() || null,
      materi: materi.trim() || null,
      score: calcScore,
      instrument_type: instrumentType,
      schedule_id: scheduleId || null,
      observation_scores: obsScoresForSave,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      if (mode === 'create') {
        const result = await createLaporan(buildPayload())
        if (result.error) { setError(result.error); return }
        router.push(`/dashboard/kepsek/laporan/${result.id}`)
      } else {
        if (!initialData?.id) { setError('Laporan tidak ditemukan.'); return }
        const result = await updateLaporan({ ...buildPayload(), id: initialData.id })
        if (result.error) { setError(result.error); return }
        setSuccess(true)
      }
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition'
  const readonlyCls = inputCls + ' bg-slate-50 text-slate-500 cursor-default'
  const labelCls = 'block font-body text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'
  const predikat = nilaiAkhir !== null ? getPredikat(nilaiAkhir) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alerts */}
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

      {/* ── Document header ─────────────────────────────────────────────────── */}
      <div className="text-center border-b-2 border-[#002147] pb-5">
        <p className="font-heading text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
          Instrumen Supervisi Akademik
        </p>
        <h2 className="font-heading text-base md:text-lg font-bold text-[#002147] uppercase tracking-wide">
          Lembar Observasi Pembelajaran Guru
        </h2>
        {isPelaksanaan && (
          <span className="inline-block mt-2 font-body text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#002147] text-white tracking-wide">
            SPVC-03
          </span>
        )}
      </div>

      {/* ── SECTION A: Identitas ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SectionLabel letter="A" />
          <h3 className="font-heading text-sm font-bold text-slate-800">IDENTITAS</h3>
        </div>

        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guru */}
            <div>
              <label htmlFor="lf-teacher" className={labelCls}>
                Nama Guru <span className="text-red-500">*</span>
              </label>
              <select
                id="lf-teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">— Pilih Guru —</option>
                {guruOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* NIP */}
            <div>
              <label htmlFor="lf-nip" className={labelCls}>NIP</label>
              <input
                id="lf-nip"
                type="text"
                value={selectedGuru?.nip ?? ''}
                readOnly
                placeholder="Otomatis dari data guru"
                className={readonlyCls}
              />
            </div>

            {/* Mata Pelajaran */}
            <div>
              <label htmlFor="lf-subject" className={labelCls}>
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <input
                id="lf-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Matematika"
                required
                className={inputCls}
              />
            </div>

            {/* Kelas */}
            <div>
              <label htmlFor="lf-class" className={labelCls}>
                Kelas / Semester <span className="text-red-500">*</span>
              </label>
              <input
                id="lf-class"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Contoh: X-A / 1"
                required
                className={inputCls}
              />
            </div>

            {/* Tanggal */}
            <div>
              <label htmlFor="lf-date" className={labelCls}>
                Hari / Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                id="lf-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                title="Hari / Tanggal supervisi"
                className={inputCls}
              />
            </div>

            {/* Jam Ke */}
            <div>
              <label htmlFor="lf-jam" className={labelCls}>Jam Ke</label>
              <input
                id="lf-jam"
                type="text"
                value={jamKe}
                onChange={(e) => setJamKe(e.target.value)}
                placeholder="Contoh: 3 – 4"
                className={inputCls}
              />
            </div>

            {/* Materi */}
            <div className="md:col-span-2">
              <label htmlFor="lf-materi" className={labelCls}>Materi Pembelajaran</label>
              <input
                id="lf-materi"
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                placeholder="Contoh: Sistem Persamaan Linear Dua Variabel"
                className={inputCls}
              />
            </div>

            {/* Supervisor */}
            <div>
              <label htmlFor="lf-supervisor" className={labelCls}>Nama Supervisor</label>
              <input
                id="lf-supervisor"
                type="text"
                value={supervisorName ?? ''}
                readOnly
                placeholder="Nama supervisor"
                title="Nama supervisor (otomatis)"
                className={readonlyCls}
              />
            </div>

            {/* Jenis Instrumen */}
            <div>
              <label htmlFor="lf-instrument" className={labelCls}>
                Jenis Instrumen <span className="text-red-500">*</span>
              </label>
              <select
                id="lf-instrument"
                value={instrumentType}
                onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
                className={inputCls}
              >
                <option value="pelaksanaan">Penilaian Pelaksanaan Pembelajaran</option>
                <option value="administrasi">Telaah Administrasi Pembelajaran</option>
                <option value="modul_ajar">Telaah Modul Ajar</option>
              </select>
            </div>

            {/* Jadwal (optional) */}
            {jadwalOptions.length > 0 && (
              <div className="md:col-span-2">
                <label htmlFor="lf-jadwal" className={labelCls}>Hubungkan ke Jadwal (opsional)</label>
                <select
                  id="lf-jadwal"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Tidak dihubungkan —</option>
                  {jadwalOptions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pelaksanaan: rubric + rekapitulasi ─────────────────────────────────── */}
      {isPelaksanaan ? (
        <>
          {/* SECTION B: Petunjuk */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SectionLabel letter="B" />
              <h3 className="font-heading text-sm font-bold text-slate-800">PETUNJUK PENGISIAN</h3>
            </div>
            <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4">
              <p className="font-body text-xs text-amber-800 mb-3">
                Klik angka pada kolom skor sesuai hasil pengamatan selama proses pembelajaran
                berlangsung.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { s: 4, k: 'Sangat Baik' },
                  { s: 3, k: 'Baik' },
                  { s: 2, k: 'Cukup' },
                  { s: 1, k: 'Kurang' },
                ].map(({ s, k }) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#002147] text-white font-heading text-xs font-bold">
                      {s}
                    </span>
                    <span className="font-body text-xs text-amber-800">
                      = {k}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION C: Instrumen Observasi */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SectionLabel letter="C" />
              <h3 className="font-heading text-sm font-bold text-slate-800">
                INSTRUMEN OBSERVASI PEMBELAJARAN
              </h3>
            </div>

            <div className="space-y-3">
              {SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Main section title */}
                  {section.groupTitle && (
                    <div className="bg-[#002147] px-4 py-2.5">
                      <p className="font-body text-xs font-bold text-white tracking-wide">
                        {section.groupTitle}
                      </p>
                    </div>
                  )}
                  {/* Subsection title */}
                  {section.subtitle && (
                    <div className="bg-[#002147]/75 px-4 py-2">
                      <p className="font-body text-xs font-semibold text-white/90">
                        {section.subtitle}
                      </p>
                    </div>
                  )}

                  {/* Column headers */}
                  <div className="grid grid-cols-[2rem_1fr_auto] items-center px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="font-body text-[10px] font-semibold text-slate-400">No</span>
                    <span className="font-body text-[10px] font-semibold text-slate-400">
                      Aspek yang Diamati
                    </span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="w-9 text-center font-body text-[10px] font-semibold text-slate-400"
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-slate-100">
                    {section.items.map((item) => (
                      <div
                        key={item.no}
                        className="grid grid-cols-[2rem_1fr_auto] items-center px-4 py-3 hover:bg-slate-50/60 transition"
                      >
                        <span className="font-body text-xs text-slate-400">{item.no}</span>
                        <span className="font-body text-sm text-slate-700 pr-3">{item.text}</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((score) => (
                            <ScoreButton
                              key={score}
                              value={score}
                              selected={obsScores[item.no] === score}
                              onClick={() => toggleItemScore(item.no, score)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section subtotal */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                    <span className="font-body text-xs text-slate-500">
                      Jumlah Skor{' '}
                      {section.subtitle
                        ? section.subtitle.replace(/^[A-E]\.\s/, '')
                        : section.groupTitle?.replace(/^\d+\.\s/, '')}
                    </span>
                    <span className="font-heading text-sm font-bold text-[#002147]">
                      {sectionSums[section.id]}{' '}
                      <span className="font-body text-xs font-normal text-slate-400">
                        / {section.maxScore}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION D: Rekapitulasi */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SectionLabel letter="D" />
              <h3 className="font-heading text-sm font-bold text-slate-800">
                REKAPITULASI HASIL PENILAIAN
              </h3>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#002147]">
                    <th className="font-body text-xs font-semibold text-white/80 text-left px-4 py-3">
                      Komponen
                    </th>
                    <th className="font-body text-xs font-semibold text-white/80 text-center px-4 py-3 w-32">
                      Skor Maks.
                    </th>
                    <th className="font-body text-xs font-semibold text-white/80 text-center px-4 py-3 w-32">
                      Skor Perolehan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {REKAPITULASI.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-body text-sm text-slate-700">{r.label}</td>
                      <td className="px-4 py-3 font-body text-sm text-slate-500 text-center">
                        {r.max}
                      </td>
                      <td className="px-4 py-3 font-heading text-sm font-semibold text-slate-800 text-center">
                        {sectionSums[r.key] ?? 0}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#002147]/5 border-t-2 border-[#002147]/20">
                    <td className="px-4 py-3 font-body text-sm font-bold text-slate-800">Total</td>
                    <td className="px-4 py-3 font-body text-sm font-bold text-slate-800 text-center">
                      {MAX_TOTAL}
                    </td>
                    <td className="px-4 py-3 font-heading text-base font-bold text-[#002147] text-center">
                      {totalObsScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nilai Akhir card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-start gap-5">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs text-slate-500 mb-1.5">Formula:</p>
                  <p className="font-body text-xs text-slate-600">
                    NA = (Skor Perolehan / {MAX_TOTAL}) × 100
                  </p>
                  <p className="font-body text-xs text-slate-400 mt-0.5">
                    = ({totalObsScore} / {MAX_TOTAL}) × 100
                  </p>
                  <div className="mt-3">
                    <p className="font-body text-[10px] text-slate-400 mb-1 uppercase tracking-wide">
                      Kategori
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { range: '91 – 100', label: 'Sangat Baik' },
                        { range: '76 – 90', label: 'Baik' },
                        { range: '61 – 75', label: 'Cukup' },
                        { range: '≤ 60', label: 'Kurang' },
                      ].map(({ range, label }) => (
                        <span key={range} className="font-body text-[10px] text-slate-500">
                          <span className="font-semibold">{range}</span> = {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-body text-[10px] text-slate-400 uppercase tracking-wide mb-1">
                    Nilai Akhir
                  </p>
                  <p className="font-heading text-3xl font-bold text-[#002147]">
                    {nilaiAkhir !== null ? nilaiAkhir.toFixed(2) : '—'}
                  </p>
                  {predikat && nilaiAkhir !== null && (
                    <span
                      className={`inline-block font-body text-xs font-semibold px-2.5 py-0.5 rounded-full border mt-1.5 ${getPredikatCls(nilaiAkhir)}`}
                    >
                      {predikat.label} ({predikat.singkat})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Non-pelaksanaan: manual score */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SectionLabel letter="B" />
            <h3 className="font-heading text-sm font-bold text-slate-800">PENILAIAN</h3>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
            <label htmlFor="lf-score" className={labelCls}>Nilai (0 – 100)</label>
            <input
              id="lf-score"
              type="number"
              min={0}
              max={100}
              value={scoreStr}
              onChange={(e) => setScoreStr(e.target.value)}
              placeholder="Masukkan nilai"
              className={inputCls + ' max-w-xs'}
            />
          </div>
        </div>
      )}

      {/* Catatan kekuatan/kelemahan kini berada di formulir SPVC-05 (kartu terpisah). */}

      {/* RTL (SPVC-07/08) kini berada pada kartu formulir terpisah. */}

      {/* ── Submit ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
        <button
          type="submit"
          disabled={
            isPending || !teacherId || !visitDate || !subject.trim() || !className.trim()
          }
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Draft
        </button>
        {isPelaksanaan && nilaiAkhir !== null && (
          <p className="font-body text-xs text-slate-500">
            Nilai akan tersimpan:{' '}
            <span className="font-semibold text-[#002147]">{nilaiAkhir.toFixed(2)}</span>
            {predikat && (
              <span className="ml-1 text-slate-400">— {predikat.label} ({predikat.singkat})</span>
            )}
          </p>
        )}
      </div>
    </form>
  )
}
