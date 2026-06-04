import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import type { RmpStatus } from '@/src/types/database'
import SupervisiCharts, {
  type MonthlyTrend,
  type PredikatCount,
} from '@/src/components/dashboard/kepsek/SupervisiCharts'

export const dynamic = 'force-dynamic'

interface RecentRmpBase {
  id: string
  judul: string
  status: RmpStatus
  updated_at: string
  guru_id: string
}

interface RecentRmpRow extends RecentRmpBase {
  guru_name: string | null
}

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  revision: { label: 'Revisi', className: 'bg-red-50 text-red-700 border border-red-200' },
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function KepsekDashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const weekAhead = new Date()
  weekAhead.setDate(today.getDate() + 7)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [
    { data: profile },
    { count: rmpPerluTinjau },
    { count: jadwalMingguIni },
    { count: laporanSelesai },
    { data: recentRmp },
    { data: rawLaporanChart },
  ] = (await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase
      .from('rmp_forms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('supervisor_id', user.id)
      .gte('scheduled_date', isoDate(today))
      .lte('scheduled_date', isoDate(weekAhead)),
    supabase
      .from('supervision_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('rmp_forms')
      .select('id, judul, status, updated_at, guru_id')
      .in('status', ['submitted', 'revision', 'approved'])
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('supervision_reports')
      .select('visit_date, score')
      .eq('supervisor_id', user.id)
      .not('score', 'is', null),
  ])) as unknown as [
    { data: { full_name: string } | null },
    { count: number | null },
    { count: number | null },
    { count: number | null },
    { data: RecentRmpBase[] | null },
    { data: { visit_date: string; score: number }[] | null },
  ]

  const metrics = [
    {
      label: 'RMP Perlu Ditinjau',
      value: rmpPerluTinjau ?? 0,
      hint: 'Modul menunggu review',
      icon: ClipboardCheck,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accent: 'border-l-amber-400',
    },
    {
      label: 'Jadwal Minggu Ini',
      value: jadwalMingguIni ?? 0,
      hint: 'Supervisi 7 hari ke depan',
      icon: CalendarDays,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      accent: 'border-l-indigo-400',
    },
    {
      label: 'Total Laporan Selesai',
      value: laporanSelesai ?? 0,
      hint: 'Laporan supervisi disetujui',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      accent: 'border-l-emerald-400',
    },
  ]

  const baseRecent = recentRmp ?? []
  const guruIds = Array.from(new Set(baseRecent.map((r) => r.guru_id)))

  let guruMap = new Map<string, string>()
  if (guruIds.length > 0) {
    const { data: gurus } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', guruIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    guruMap = new Map((gurus ?? []).map((g) => [g.id, g.full_name]))
  }

  const recent: RecentRmpRow[] = baseRecent.map((r) => ({
    ...r,
    guru_name: guruMap.get(r.guru_id) ?? null,
  }))

  // Proses MonthlyTrend — 6 bulan terakhir
  const scored = rawLaporanChart ?? []
  const sixMonthsAgoStr = isoDate(sixMonthsAgo)

  const monthMap = new Map<string, { total: number; count: number }>()
  for (const r of scored) {
    if (r.visit_date < sixMonthsAgoStr) continue
    const key = r.visit_date.slice(0, 7) // YYYY-MM
    const entry = monthMap.get(key) ?? { total: 0, count: 0 }
    entry.total += r.score
    entry.count += 1
    monthMap.set(key, entry)
  }

  const monthlyTrend: MonthlyTrend[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'short' })
    const entry = monthMap.get(key)
    monthlyTrend.push({
      month: label,
      avg: entry ? Math.round((entry.total / entry.count) * 10) / 10 : 0,
      count: entry?.count ?? 0,
    })
  }

  // Proses PredikatCount — semua laporan dengan score
  const predikatData: PredikatCount[] = [
    {
      name: 'SB',
      label: 'Sangat Baik',
      value: scored.filter((r) => r.score >= 91).length,
      color: '#10b981',
    },
    {
      name: 'B',
      label: 'Baik',
      value: scored.filter((r) => r.score >= 81 && r.score < 91).length,
      color: '#3b82f6',
    },
    {
      name: 'C',
      label: 'Cukup',
      value: scored.filter((r) => r.score >= 71 && r.score < 81).length,
      color: '#f59e0b',
    },
    {
      name: 'K',
      label: 'Kurang',
      value: scored.filter((r) => r.score < 71).length,
      color: '#ef4444',
    },
  ]

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Dasbor</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5 truncate">
            Selamat datang,{' '}
            <span className="font-semibold text-slate-700">
              {profile?.full_name ?? 'Kepala Sekolah'}
            </span>
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
          <section>
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4">
              Ringkasan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {metrics.map(({ label, value, hint, icon: Icon, iconColor, iconBg, accent }) => (
                <div
                  key={label}
                  className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accent} px-5 py-5 shadow-sm hover:shadow-md hover:border-amber-300 transition`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm font-medium text-slate-500">{label}</span>
                    <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                  </div>
                  <p className="font-heading text-3xl font-bold text-slate-900 mt-3">
                    {value.toLocaleString('id-ID')}
                  </p>
                  <p className="font-body text-xs text-slate-400 mt-1">{hint}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4">
              Analitik Supervisi
            </h2>
            <SupervisiCharts monthlyTrend={monthlyTrend} predikatData={predikatData} />
          </section>

          <section className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <h3 className="font-heading text-base font-bold text-slate-900">
                  RMP Terbaru
                </h3>
              </div>
              <Link
                href="/dashboard/kepsek/rmp"
                className="font-body text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Lihat semua
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-body text-sm text-slate-500">
                  Belum ada modul yang dikirim oleh guru.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/dashboard/kepsek/rmp/${item.id}`}
                        className="flex items-center gap-3 px-5 md:px-6 py-3.5 hover:bg-slate-50/60 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-sm font-semibold text-slate-800 truncate">
                            {item.judul || 'Tanpa Judul'}
                          </p>
                          <p className="font-body text-xs text-slate-500 mt-0.5 truncate">
                            {item.guru_name ?? 'Guru tidak diketahui'} ·{' '}
                            {formatDate(item.updated_at)}
                          </p>
                        </div>
                        <span
                          className={`font-body text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
