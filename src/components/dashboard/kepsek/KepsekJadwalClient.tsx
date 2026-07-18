'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import {
  cancelSchedule,
  completeSchedule,
  createSchedule,
  updateSchedule,
  type SchedulePayload,
} from '@/src/app/dashboard/kepsek/jadwal/actions'
import type { Schedule, ScheduleStatus } from '@/src/types/database'
import { SECTIONS, SECTION_SHORT_LABEL } from '@/src/lib/laporan-rubrik'

interface GuruOption {
  id: string
  full_name: string
}

interface ScheduleRow extends Schedule {
  teacher_name: string | null
}

interface Props {
  initialSchedules: ScheduleRow[]
  guruOptions: GuruOption[]
}

function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

const STATUS_BADGE: Record<ScheduleStatus, { label: string; className: string }> = {
  dijadwalkan: {
    label: 'Dijadwalkan',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  selesai: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  dibatalkan: {
    label: 'Dibatalkan',
    className: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
}

const STATUS_FILTERS: { value: 'semua' | ScheduleStatus; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'dijadwalkan', label: 'Dijadwalkan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function KepsekJadwalClient({ initialSchedules, guruOptions }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<'semua' | ScheduleStatus>('semua')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ScheduleRow | null>(null)
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialSchedules.filter((s) => {
      if (statusFilter !== 'semua' && s.status !== statusFilter) return false
      if (!q) return true
      return (
        (s.teacher_name ?? '').toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q)
      )
    })
  }, [initialSchedules, statusFilter, search])

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(s: ScheduleRow) {
    setEditing(s)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition ${
                  active
                    ? 'bg-[#002147] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <div className="flex-1 relative md:max-w-xs md:ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari guru, mata pelajaran, kelas..."
            aria-label="Cari jadwal"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none transition"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 transition"
        >
          <CalendarPlus className="w-4 h-4" />
          Buat Jadwal
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-16 text-center">
          <p className="font-body text-sm text-slate-500">
            {initialSchedules.length === 0
              ? 'Belum ada jadwal. Klik "Buat Jadwal" untuk menambah.'
              : 'Tidak ada jadwal yang cocok dengan filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-[#002147]">
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Tanggal & Waktu
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Guru
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Mata Pelajaran
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Kelas
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Status
                </th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                  Meeting
                </th>
                <th className="px-5 md:px-6 py-3.5 w-44" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.dijadwalkan
                const isScheduled = s.status === 'dijadwalkan'
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 md:px-6 py-4 font-body">
                      <p className="font-medium text-slate-800">{formatDate(s.scheduled_date)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.scheduled_time.slice(0, 5)}</p>
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                      {s.teacher_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{s.subject}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{s.class_name}</td>
                    <td className="px-5 md:px-6 py-4">
                      <span
                        className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 md:px-6 py-4">
                      <ZoomLinkButtons schedule={s} />
                    </td>
                    <td className="px-5 md:px-6 py-4 text-right">
                      {isScheduled ? (
                        <RowActions
                          schedule={s}
                          onEdit={() => openEdit(s)}
                          onRefresh={() => router.refresh()}
                        />
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ScheduleFormModal
          editing={editing}
          guruOptions={guruOptions}
          onClose={closeForm}
          onSaved={() => {
            closeForm()
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function RowActions({
  schedule,
  onEdit,
  onRefresh,
}: {
  schedule: Schedule
  onEdit: () => void
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<'cancel' | 'complete' | null>(null)

  function handle(action: 'cancel' | 'complete') {
    startTransition(async () => {
      const result =
        action === 'cancel'
          ? await cancelSchedule(schedule.id)
          : await completeSchedule(schedule.id)
      if (result.error) {
        alert(result.error)
        return
      }
      setConfirming(null)
      onRefresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        disabled={isPending}
        title="Edit jadwal"
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#002147] disabled:opacity-40 transition"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming('complete')}
        disabled={isPending}
        title="Tandai selesai"
        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition"
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming('cancel')}
        disabled={isPending}
        title="Batalkan jadwal"
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition"
      >
        <XCircle className="w-4 h-4" />
      </button>

      {confirming && (
        <ConfirmDialog
          message={
            confirming === 'cancel'
              ? 'Batalkan jadwal supervisi ini? Guru akan diberi tahu.'
              : 'Tandai jadwal ini sebagai selesai?'
          }
          confirmLabel={confirming === 'cancel' ? 'Ya, Batalkan' : 'Ya, Tandai Selesai'}
          danger={confirming === 'cancel'}
          isPending={isPending}
          onConfirm={() => handle(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  isPending,
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel: string
  danger?: boolean
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <p className="font-body text-sm text-slate-700 leading-relaxed">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-sm font-semibold text-white disabled:opacity-50 transition ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ZoomLinkButtons({ schedule }: { schedule: Schedule }) {
  const links = [
    { key: 'pra', label: 'Pra', href: safeHttpUrl(schedule.zoom_link_pra) },
    { key: 'pengamatan', label: 'Pengamatan', href: safeHttpUrl(schedule.zoom_link_pengamatan) },
    { key: 'pasca', label: 'Pasca', href: safeHttpUrl(schedule.zoom_link_pasca) },
  ].filter((l) => l.href)

  if (links.length === 0) return <span className="text-slate-300 text-xs">—</span>

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          title={`Zoom ${l.label}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-body text-xs font-medium transition"
        >
          <Video className="w-3 h-3" />
          {l.label}
        </a>
      ))}
    </div>
  )
}

function ScheduleFormModal({
  editing,
  guruOptions,
  onClose,
  onSaved,
}: {
  editing: ScheduleRow | null
  guruOptions: GuruOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [teacherId, setTeacherId] = useState(editing?.teacher_id ?? '')
  const [date, setDate] = useState(editing?.scheduled_date ?? '')
  const [time, setTime] = useState(editing?.scheduled_time?.slice(0, 5) ?? '')
  const [subject, setSubject] = useState(editing?.subject ?? '')
  const [className, setClassName] = useState(editing?.class_name ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [zoomLinkPra, setZoomLinkPra] = useState(editing?.zoom_link_pra ?? '')
  const [zoomLinkPengamatan, setZoomLinkPengamatan] = useState(editing?.zoom_link_pengamatan ?? '')
  const [zoomLinkPasca, setZoomLinkPasca] = useState(editing?.zoom_link_pasca ?? '')
  const [kontrakFokus, setKontrakFokus] = useState<string[]>(editing?.kontrak_fokus ?? [])
  const [kontrakCatatan, setKontrakCatatan] = useState(editing?.kontrak_catatan ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleFokus(label: string) {
    setKontrakFokus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload: SchedulePayload = {
      teacher_id: teacherId,
      scheduled_date: date,
      scheduled_time: time.length === 5 ? `${time}:00` : time,
      subject,
      class_name: className,
      notes,
      zoom_link_pra: zoomLinkPra || null,
      zoom_link_pengamatan: zoomLinkPengamatan || null,
      zoom_link_pasca: zoomLinkPasca || null,
      kontrak_fokus: kontrakFokus.length > 0 ? kontrakFokus : null,
      kontrak_catatan: kontrakCatatan || null,
    }

    startTransition(async () => {
      const result = editing
        ? await updateSchedule({ ...payload, id: editing.id })
        : await createSchedule(payload)
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-slate-900">
            {editing ? 'Edit Jadwal Supervisi' : 'Buat Jadwal Supervisi'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 md:px-6 py-5 space-y-4 overflow-y-auto">
          <Field label="Guru" htmlFor="sch-guru">
            <select
              id="sch-guru"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              disabled={isPending}
              required
              className={inputClass}
            >
              <option value="">Pilih guru...</option>
              {guruOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tanggal" htmlFor="sch-date">
              <input
                id="sch-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Waktu" htmlFor="sch-time">
              <input
                id="sch-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isPending}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mata Pelajaran" htmlFor="sch-subject">
              <input
                id="sch-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isPending}
                required
                placeholder="Contoh: Bahasa Indonesia"
                className={inputClass}
              />
            </Field>
            <Field label="Kelas" htmlFor="sch-class">
              <input
                id="sch-class"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={isPending}
                required
                placeholder="Contoh: 10 IPA 2"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="font-body text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Link Meeting (opsional)
            </p>
            <div className="space-y-3">
              <Field label="Link Zoom Pra-Konferensi" htmlFor="sch-zoom-pra">
                <input
                  id="sch-zoom-pra"
                  type="url"
                  value={zoomLinkPra}
                  onChange={(e) => setZoomLinkPra(e.target.value)}
                  disabled={isPending}
                  placeholder="https://zoom.us/j/..."
                  className={inputClass}
                />
              </Field>
              <Field label="Link Pengamatan (video/live)" htmlFor="sch-zoom-pengamatan">
                <input
                  id="sch-zoom-pengamatan"
                  type="url"
                  value={zoomLinkPengamatan}
                  onChange={(e) => setZoomLinkPengamatan(e.target.value)}
                  disabled={isPending}
                  placeholder="https://zoom.us/j/... atau link video"
                  className={inputClass}
                />
              </Field>
              <Field label="Link Zoom Pasca-Konferensi" htmlFor="sch-zoom-pasca">
                <input
                  id="sch-zoom-pasca"
                  type="url"
                  value={zoomLinkPasca}
                  onChange={(e) => setZoomLinkPasca(e.target.value)}
                  disabled={isPending}
                  placeholder="https://zoom.us/j/..."
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <Field label="Catatan (opsional)" htmlFor="sch-notes">
            <textarea
              id="sch-notes"
              value={notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Hal khusus terkait supervisi..."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </Field>

          {/* ── Kontrak Pra-Konferensi (SPVC-02) ─────────────────────────────── */}
          <div className="border-t border-slate-100 pt-4">
            <p className="font-body text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Kontrak Pra-Konferensi
            </p>
            <p className="font-body text-xs text-slate-400 mt-1 mb-3">
              Sepakati fokus observasi bersama guru sebelum pengamatan. Aspek yang dipilih menjadi
              titik perhatian utama saat penilaian.
            </p>

            <p className="font-body text-xs font-medium text-slate-600 mb-2">Fokus Observasi</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECTIONS.map((section) => {
                const label = SECTION_SHORT_LABEL[section.id] ?? section.id
                const checked = kontrakFokus.includes(label)
                return (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => toggleFokus(label)}
                    disabled={isPending}
                    className={`flex items-center gap-2.5 text-left rounded-lg border px-3 py-2 transition disabled:opacity-50 ${
                      checked
                        ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-[18px] h-[18px] rounded shrink-0 border transition ${
                        checked
                          ? 'bg-amber-400 border-amber-400 text-slate-900'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    <span className="font-body text-xs font-medium text-slate-700">{label}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3">
              <Field label="Kesepakatan / Catatan Kontrak (opsional)" htmlFor="sch-kontrak-catatan">
                <textarea
                  id="sch-kontrak-catatan"
                  value={kontrakCatatan ?? ''}
                  onChange={(e) => setKontrakCatatan(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Contoh: Fokus pada peningkatan fasilitasi bernalar kritis siswa."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </Field>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="font-body text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-lg font-body text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 transition"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Simpan Perubahan' : 'Buat Jadwal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition'

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
