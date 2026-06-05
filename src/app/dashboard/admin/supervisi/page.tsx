import { redirect } from 'next/navigation'
import { BarChart3, CheckCircle2, Clock, FileText, TrendingUp } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import AdminSidebar from '@/src/components/dashboard/AdminSidebar'

export const dynamic = 'force-dynamic'

function getPredikat(score: number | null): { label: string; className: string } {
  if (!score || score <= 0) return { label: '—', className: 'text-slate-400' }
  if (score >= 91) return { label: 'SB', className: 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold' }
  if (score >= 81) return { label: 'B', className: 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold' }
  if (score >= 71) return { label: 'C', className: 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold' }
  return { label: 'K', className: 'text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-semibold' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  submitted: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL: Record<string, string> = {
  approved: 'Disetujui',
  submitted: 'Menunggu',
  draft: 'Draft',
}

export default async function AdminSupervisiPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [reportsRes, profilesRes] = await Promise.all([
    supabase
      .from('supervision_reports')
      .select('*')
      .order('visit_date', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, role'),
  ])

  const reports = (reportsRes.data ?? []) as {
    id: string
    supervisor_id: string
    teacher_id: string
    visit_date: string
    subject: string
    class_name: string
    score: number | null
    status: string
  }[]

  const profileMap = Object.fromEntries(
    ((profilesRes.data ?? []) as { id: string; full_name: string; role: string }[]).map((p) => [p.id, p.full_name])
  )

  const rows = reports.map((r) => ({
    ...r,
    supervisor_name: profileMap[r.supervisor_id] ?? '—',
    teacher_name: profileMap[r.teacher_id] ?? '—',
  }))

  const totalLaporan = rows.length
  const totalApproved = rows.filter((r) => r.status === 'approved').length
  const totalPending = rows.filter((r) => r.status === 'submitted').length
  const scoredRows = rows.filter((r) => r.score && r.score > 0)
  const avgScore = scoredRows.length
    ? Math.round(scoredRows.reduce((sum, r) => sum + (r.score ?? 0), 0) / scoredRows.length)
    : 0

  const metrics = [
    { label: 'Total Laporan', value: totalLaporan, icon: FileText, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { label: 'Disetujui', value: totalApproved, icon: CheckCircle2, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    { label: 'Menunggu Review', value: totalPending, icon: Clock, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
    { label: 'Rata-rata Skor', value: avgScore > 0 ? avgScore : '—', icon: TrendingUp, iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
  ]

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
                Data Supervisi
              </h1>
              <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
                Ringkasan seluruh laporan supervisi di sekolah
              </p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 space-y-6">

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => {
              const Icon = m.icon
              return (
                <div key={m.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body text-xs font-medium text-slate-500">{m.label}</span>
                    <div className={`w-9 h-9 rounded-lg ${m.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${m.iconColor}`} />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-bold text-slate-900">{m.value}</p>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 md:px-6 py-4 border-b border-slate-100">
              <h2 className="font-heading text-base font-bold text-slate-900">
                Semua Laporan Supervisi
              </h2>
              <p className="font-body text-xs text-slate-400 mt-0.5">
                {totalLaporan} laporan tercatat
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="font-body text-sm text-slate-400">Belum ada laporan supervisi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#002147]">
                      {['Kepala Sekolah', 'Guru', 'Mata Pelajaran', 'Kelas', 'Tanggal', 'Skor', 'Predikat', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="font-body font-semibold text-white/80 text-left px-4 py-3.5 text-xs whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r) => {
                      const predikat = getPredikat(r.score)
                      const badge = STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500'
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-body text-sm font-medium text-slate-800 whitespace-nowrap">
                              {r.supervisor_name}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-body text-sm text-slate-700 whitespace-nowrap">
                              {r.teacher_name}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-body text-sm text-slate-600 max-w-[160px] truncate">
                              {r.subject}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-body text-sm text-slate-600 whitespace-nowrap">
                              {r.class_name}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-body text-xs text-slate-500 whitespace-nowrap">
                              {formatDate(r.visit_date)}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-body text-sm font-semibold text-slate-800">
                              {r.score ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`font-body text-xs ${predikat.className}`}>
                              {predikat.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`font-body text-xs font-semibold px-2.5 py-1 rounded-full ${badge}`}>
                              {STATUS_LABEL[r.status] ?? r.status}
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

        </main>
      </div>
    </div>
  )
}
