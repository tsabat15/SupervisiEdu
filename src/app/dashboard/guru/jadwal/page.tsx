import { redirect } from 'next/navigation'
import { Calendar, CheckCircle2, Clock, Target, Video, XCircle } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { Schedule, ScheduleStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface ScheduleRow extends Schedule {
  supervisor_name: string | null
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

const STATUS_ICON: Record<ScheduleStatus, { Icon: typeof Clock; color: string }> = {
  dijadwalkan: { Icon: Clock, color: 'text-amber-600' },
  selesai: { Icon: CheckCircle2, color: 'text-emerald-600' },
  dibatalkan: { Icon: XCircle, color: 'text-slate-400' },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ZoomLinksCell({ schedule }: { schedule: ScheduleRow }) {
  const links = [
    { label: 'Pra', href: safeHttpUrl(schedule.zoom_link_pra) },
    { label: 'Pengamatan', href: safeHttpUrl(schedule.zoom_link_pengamatan) },
    { label: 'Pasca', href: safeHttpUrl(schedule.zoom_link_pasca) },
  ].filter((l) => l.href)

  if (links.length === 0) return <span className="text-slate-400 font-body text-xs">—</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-body text-xs font-semibold hover:bg-amber-50 hover:text-amber-700 transition"
        >
          <Video className="w-3 h-3" />
          {l.label}
        </a>
      ))}
    </div>
  )
}

function getActivePhase(schedule: ScheduleRow, todayIso: string): 'pra' | 'saat' | 'pasca' {
  if (schedule.status === 'selesai') return 'pasca'
  if (schedule.scheduled_date === todayIso) return 'saat'
  return 'pra'
}

export default async function GuruJadwalPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayIso = new Date().toISOString().slice(0, 10)

  const { data: rawSchedules } = (await supabase
    .from('schedules')
    .select('*')
    .eq('teacher_id', user.id)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })) as unknown as { data: Schedule[] | null }

  const schedules = rawSchedules ?? []
  const supervisorIds = Array.from(new Set(schedules.map((s) => s.supervisor_id)))

  let supervisorMap = new Map<string, string>()
  if (supervisorIds.length > 0) {
    const { data: sups } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', supervisorIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    supervisorMap = new Map((sups ?? []).map((s) => [s.id, s.full_name]))
  }

  const upcoming: ScheduleRow[] = []
  const past: ScheduleRow[] = []

  for (const s of schedules) {
    const row: ScheduleRow = {
      ...s,
      supervisor_name: supervisorMap.get(s.supervisor_id) ?? null,
    }
    if (s.status === 'dijadwalkan' && s.scheduled_date >= todayIso) {
      upcoming.push(row)
    } else {
      past.push(row)
    }
  }

  past.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Jadwal Supervisi
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Daftar supervisi yang dijadwalkan untuk Anda.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 space-y-6">
          <section>
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-3">
              Akan Datang
              {upcoming.length > 0 && (
                <span className="ml-2 font-body text-xs font-medium text-slate-500">
                  ({upcoming.length})
                </span>
              )}
            </h2>
            {upcoming.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <p className="font-body text-sm text-slate-500">
                  Tidak ada jadwal supervisi dalam waktu dekat.
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcoming.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} todayIso={todayIso} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-3">
              Riwayat
              {past.length > 0 && (
                <span className="ml-2 font-body text-xs font-medium text-slate-500">
                  ({past.length})
                </span>
              )}
            </h2>
            {past.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 px-6 py-8 text-center">
                <p className="font-body text-sm text-slate-500">Belum ada riwayat supervisi.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-[#002147]">
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Tanggal
                      </th>
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Mata Pelajaran
                      </th>
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Kelas
                      </th>
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Supervisor
                      </th>
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Meeting
                      </th>
                      <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {past.map((s) => {
                      const badge = STATUS_BADGE[s.status]
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 md:px-6 py-4 font-body">
                            <p className="font-medium text-slate-800">
                              {formatDate(s.scheduled_date)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {s.scheduled_time.slice(0, 5)}
                            </p>
                          </td>
                          <td className="px-5 md:px-6 py-4 font-body text-slate-700">{s.subject}</td>
                          <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                            {s.class_name}
                          </td>
                          <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                            {s.supervisor_name ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-5 md:px-6 py-4">
                            <ZoomLinksCell schedule={s} />
                          </td>
                          <td className="px-5 md:px-6 py-4">
                            <span
                              className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
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
          </section>
        </main>
      </div>
    </div>
  )
}

function KontrakBlock({ schedule }: { schedule: ScheduleRow }) {
  const fokus = Array.isArray(schedule.kontrak_fokus) ? schedule.kontrak_fokus : []
  const catatan = schedule.kontrak_catatan?.trim()
  if (fokus.length === 0 && !catatan) return null

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Target className="w-3.5 h-3.5 text-amber-600" />
        <p className="font-body text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
          Fokus Observasi (Kontrak)
        </p>
      </div>
      {fokus.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {fokus.map((f) => (
            <span
              key={f}
              className="inline-block font-body text-[11px] font-medium text-amber-800 bg-amber-100 rounded-full px-2 py-0.5"
            >
              {f}
            </span>
          ))}
        </div>
      )}
      {catatan && (
        <p className="font-body text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
          {catatan}
        </p>
      )}
    </div>
  )
}

function ScheduleCard({ schedule, todayIso }: { schedule: ScheduleRow; todayIso: string }) {
  const badge = STATUS_BADGE[schedule.status]
  const { Icon, color } = STATUS_ICON[schedule.status]
  const activePhase = getActivePhase(schedule, todayIso)
  const isToday = schedule.scheduled_date === todayIso

  const phases: { key: 'pra' | 'saat' | 'pasca'; label: string; link: string | null }[] = [
    { key: 'pra', label: 'Pra', link: safeHttpUrl(schedule.zoom_link_pra) },
    { key: 'saat', label: 'Pengamatan', link: safeHttpUrl(schedule.zoom_link_pengamatan) },
    { key: 'pasca', label: 'Pasca', link: safeHttpUrl(schedule.zoom_link_pasca) },
  ]

  const phaseOrder = ['pra', 'saat', 'pasca']
  const activeIdx = phaseOrder.indexOf(activePhase)

  return (
    <li
      className={`bg-white rounded-xl border px-5 py-4 transition ${
        isToday
          ? 'border-amber-400 shadow-md shadow-amber-100'
          : 'border-slate-200 hover:border-amber-300 hover:shadow-md'
      }`}
    >
      {isToday && (
        <div className="mb-3 -mx-5 -mt-4 px-5 py-2 bg-amber-50 rounded-t-xl border-b border-amber-200">
          <p className="font-body text-xs font-semibold text-amber-700">Supervisi Hari Ini</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-slate-900 truncate">
            {schedule.subject} <span className="font-normal text-slate-500">·</span>{' '}
            {schedule.class_name}
          </p>
          <p className="font-body text-xs text-slate-600 mt-1">
            {formatDate(schedule.scheduled_date)} · {schedule.scheduled_time.slice(0, 5)}
          </p>
          {schedule.supervisor_name && (
            <p className="font-body text-xs text-slate-500 mt-1">
              Supervisor:{' '}
              <span className="font-medium text-slate-700">{schedule.supervisor_name}</span>
            </p>
          )}
          {schedule.notes && (
            <p className="font-body text-xs text-slate-500 mt-2 italic border-l-2 border-slate-200 pl-2">
              {schedule.notes}
            </p>
          )}

          <KontrakBlock schedule={schedule} />

          {/* Phase Timeline */}
          <div className="mt-3">
            <div className="flex items-center">
              {phases.map((phase, i) => {
                const idx = phaseOrder.indexOf(phase.key)
                const isDone = idx < activeIdx
                const isActive = idx === activeIdx
                return (
                  <div key={phase.key} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isDone
                            ? 'bg-emerald-500'
                            : isActive
                            ? 'bg-amber-500 ring-2 ring-amber-200'
                            : 'bg-slate-200'
                        }`}
                      />
                      <span
                        className={`font-body text-[10px] whitespace-nowrap ${
                          isActive ? 'text-amber-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {phase.label}
                      </span>
                    </div>
                    {i < phases.length - 1 && (
                      <div
                        className={`h-px w-8 mb-3 ${
                          idx < activeIdx ? 'bg-emerald-300' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Zoom Buttons */}
          {phases.some((p) => p.link) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {phases
                .filter((p) => p.link)
                .map((phase) => (
                  <a
                    key={phase.key}
                    href={phase.link!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition ${
                      phase.key === activePhase
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-sm shadow-amber-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    {phase.key === 'pra'
                      ? 'Zoom Pra-Konferensi'
                      : phase.key === 'saat'
                      ? 'Zoom Pengamatan'
                      : 'Zoom Pasca-Konferensi'}
                  </a>
                ))}
            </div>
          )}
        </div>
        <span
          className={`inline-block font-body text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
    </li>
  )
}
