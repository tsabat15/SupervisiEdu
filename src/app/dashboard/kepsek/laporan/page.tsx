import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import KepsekLaporanClient from '@/src/components/dashboard/kepsek/KepsekLaporanClient'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface LaporanRow {
  id: string
  teacher_name: string | null
  subject: string
  class_name: string
  visit_date: string
  score: number | null
  status: SupervisionReport['status']
}

export default async function KepsekLaporanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: rawReports } = (await supabase
    .from('supervision_reports')
    .select('id, teacher_id, subject, class_name, visit_date, score, status')
    .eq('supervisor_id', user.id)
    .order('visit_date', { ascending: false })) as unknown as {
    data:
      | {
          id: string
          teacher_id: string
          subject: string
          class_name: string
          visit_date: string
          score: number | null
          status: SupervisionReport['status']
        }[]
      | null
  }

  const reports = rawReports ?? []
  const teacherIds = Array.from(new Set(reports.map((r) => r.teacher_id)))

  let teacherMap = new Map<string, string>()
  if (teacherIds.length > 0) {
    const { data: teachers } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]))
  }

  const rows: LaporanRow[] = reports.map((r) => ({
    id: r.id,
    teacher_name: teacherMap.get(r.teacher_id) ?? null,
    subject: r.subject,
    class_name: r.class_name,
    visit_date: r.visit_date,
    score: r.score,
    status: r.status,
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Laporan Supervisi
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Kelola laporan hasil observasi guru.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <KepsekLaporanClient initialReports={rows} />
        </main>
      </div>
    </div>
  )
}
