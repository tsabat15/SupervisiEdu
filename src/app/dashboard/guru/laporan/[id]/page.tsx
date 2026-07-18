import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import LaporanRadarChart from '@/src/components/dashboard/kepsek/LaporanRadarChart'
import LaporanDokumentasi from '@/src/components/dashboard/kepsek/LaporanDokumentasi'
import SpvcNarrativeForm from '@/src/components/dashboard/kepsek/SpvcNarrativeForm'
import LaporanRtlForm from '@/src/components/dashboard/kepsek/LaporanRtlForm'
import { SPVC_FORMS, type SpvcColumn } from '@/src/lib/spvc-forms'
import type { SupervisionReport, SpvcData } from '@/src/types/database'

/** Isi formulir SPVC; SPVC-05 jatuh balik ke catatan lama bila belum diisi ulang. */
function spvcInitial(laporan: SupervisionReport, column: SpvcColumn): SpvcData | null {
  const current = laporan[column]
  if (current && Object.keys(current).length > 0) return current

  if (column === 'spvc05') {
    const kekuatan = (laporan.strengths ?? '').trim()
    const kelemahan = (laporan.improvements ?? '').trim()
    if (kekuatan || kelemahan) return { kekuatan, kelemahan }
  }
  return null
}

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getPredikat(score: number): { label: string; singkat: string; cls: string } {
  if (score >= 91) return { label: 'Sangat Baik', singkat: 'SB', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (score >= 76) return { label: 'Baik', singkat: 'B', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (score >= 61) return { label: 'Cukup', singkat: 'C', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Kurang', singkat: 'K', cls: 'bg-red-50 text-red-700 border-red-200' }
}

const INSTRUMENT_LABEL: Record<string, string> = {
  pelaksanaan: 'Penilaian Pelaksanaan Pembelajaran',
  administrasi: 'Telaah Administrasi Pembelajaran',
  modul_ajar: 'Telaah Modul Ajar',
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="font-body text-slate-400">Tidak ada nilai</span>
  const predikat = getPredikat(score)
  return (
    <div
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${predikat.cls}`}
    >
      <span className="font-heading text-2xl font-bold">{score}</span>
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
          <p className="font-body text-xs text-slate-400 mt-0.5">
            {INSTRUMENT_LABEL[laporan.instrument_type] ?? 'Penilaian Pelaksanaan Pembelajaran'}
            {laporan.jam_ke ? ` · Jam ke-${laporan.jam_ke}` : ''}
          </p>
          {laporan.materi && (
            <p className="font-body text-xs text-slate-400 mt-0.5">Materi: {laporan.materi}</p>
          )}
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5 flex items-center gap-5">
            <ScoreDisplay score={laporan.score} />
            <div>
              <p className="font-body text-xs text-slate-500">Nilai Supervisi</p>
              {laporan.score !== null ? (
                <>
                  <p className="font-heading text-sm font-bold text-slate-900 mt-0.5">
                    {getPredikat(laporan.score).label}{' '}
                    <span className="text-slate-400">({getPredikat(laporan.score).singkat})</span>
                  </p>
                  <p className="font-body text-xs text-slate-400 mt-0.5">
                    SB ≥91 · B ≥76 · C ≥61 · K &lt;61
                  </p>
                </>
              ) : (
                <p className="font-heading text-sm font-bold text-slate-500 mt-0.5">Belum dinilai</p>
              )}
            </div>
          </div>

          {laporan.instrument_type === 'pelaksanaan' && (
            <LaporanRadarChart observationScores={laporan.observation_scores} />
          )}

          {/* Urutan sesuai buku: 04 → 05 → 06 → 07/08 (RTL) → 09 */}
          {SPVC_FORMS.filter((d) => d.column !== 'spvc09').map((def) => (
            <SpvcNarrativeForm
              key={def.column}
              reportId={laporan.id}
              def={def}
              initialData={spvcInitial(laporan, def.column)}
              readOnly
            />
          ))}

          <LaporanRtlForm
            reportId={laporan.id}
            initialItems={laporan.rtl_items}
            legacyRecommendation={laporan.recommendations}
            readOnly
          />

          {SPVC_FORMS.filter((d) => d.column === 'spvc09').map((def) => (
            <SpvcNarrativeForm
              key={def.column}
              reportId={laporan.id}
              def={def}
              initialData={spvcInitial(laporan, def.column)}
              readOnly
            />
          ))}
          <LaporanDokumentasi
            reportId={laporan.id}
            initialDocs={laporan.documentation_urls}
            readOnly
          />
        </main>
      </div>
    </div>
  )
}
