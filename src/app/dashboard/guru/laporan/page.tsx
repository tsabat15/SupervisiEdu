import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : score >= 60
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-block font-body text-sm font-bold px-3 py-0.5 rounded-full ${cls}`}>
      {score}
    </span>
  )
}

export default async function GuruLaporanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reports } = (await supabase
    .from('supervision_reports')
    .select('id, supervisor_id, subject, class_name, visit_date, score')
    .eq('teacher_id', user.id)
    .eq('status', 'submitted')
    .order('visit_date', { ascending: false })) as unknown as {
    data:
      | {
          id: string
          supervisor_id: string
          subject: string
          class_name: string
          visit_date: string
          score: number | null
        }[]
      | null
  }

  const items = reports ?? []
  const supervisorIds = Array.from(new Set(items.map((r) => r.supervisor_id)))

  let supervisorMap = new Map<string, string>()
  if (supervisorIds.length > 0) {
    const { data: supervisors } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', supervisorIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    supervisorMap = new Map((supervisors ?? []).map((s) => [s.id, s.full_name]))
  }

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Laporan Saya</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Laporan supervisi yang diterima dari kepala sekolah.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="font-body text-sm text-slate-500">
                Belum ada laporan supervisi untuk Anda.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((r) => (
                <li key={r.id}>
                  <a
                    href={`/dashboard/guru/laporan/${r.id}`}
                    className="block bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-amber-300 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-slate-900 truncate">
                          {r.subject} · {r.class_name}
                        </p>
                        <p className="font-body text-xs text-slate-500 mt-1">
                          {formatDate(r.visit_date)}
                        </p>
                        <p className="font-body text-xs text-slate-500 mt-0.5">
                          Oleh:{' '}
                          <span className="font-medium text-slate-700">
                            {supervisorMap.get(r.supervisor_id) ?? '—'}
                          </span>
                        </p>
                      </div>
                      <ScoreBadge score={r.score} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
