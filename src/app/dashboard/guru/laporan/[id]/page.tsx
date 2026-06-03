import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="font-body text-slate-400">Tidak ada nilai</span>
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 60
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200'
  return (
    <div
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${cls}`}
    >
      <span className="font-heading text-2xl font-bold">{score}</span>
    </div>
  )
}

function SectionBlock({
  title,
  content,
}: {
  title: string
  content: string | null
}) {
  if (!content) return null
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <h2 className="font-heading text-sm font-bold text-[#002147] mb-3">{title}</h2>
      <p className="font-body text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  )
}

export default async function GuruLaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  if (!profile || profile.role !== 'guru') redirect('/dashboard')

  const { data: laporan } = (await supabase
    .from('supervision_reports')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: SupervisionReport | null }

  if (!laporan) notFound()
  if (laporan.teacher_id !== user.id || laporan.status !== 'submitted') {
    redirect('/dashboard/guru/laporan')
  }

  const { data: supervisor } = (await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', laporan.supervisor_id)
    .single()) as unknown as { data: { full_name: string } | null }

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            {laporan.subject} · {laporan.class_name}
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            {formatDate(laporan.visit_date)} · Oleh {supervisor?.full_name ?? '—'}
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5 flex items-center gap-5">
            <ScoreDisplay score={laporan.score} />
            <div>
              <p className="font-body text-xs text-slate-500">Nilai Supervisi</p>
              <p className="font-heading text-sm font-bold text-slate-900 mt-0.5">
                {laporan.score !== null
                  ? laporan.score >= 80
                    ? 'Sangat Baik'
                    : laporan.score >= 60
                    ? 'Cukup Baik'
                    : 'Perlu Peningkatan'
                  : 'Belum dinilai'}
              </p>
            </div>
          </div>

          <SectionBlock title="Kekuatan yang Diamati" content={laporan.strengths} />
          <SectionBlock title="Area yang Perlu Ditingkatkan" content={laporan.improvements} />
          <SectionBlock title="Rekomendasi" content={laporan.recommendations} />
        </main>
      </div>
    </div>
  )
}
