import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import LaporanForm from '@/src/components/dashboard/kepsek/LaporanForm'
import LaporanDetailActions from '@/src/components/dashboard/kepsek/LaporanDetailActions'
import LaporanPrintView from '@/src/components/dashboard/kepsek/LaporanPrintView'
import PrintButton from '@/src/components/dashboard/kepsek/PrintButton'
import LaporanRadarChart from '@/src/components/dashboard/kepsek/LaporanRadarChart'
import LaporanDokumentasi from '@/src/components/dashboard/kepsek/LaporanDokumentasi'
import SpvcNarrativeForm from '@/src/components/dashboard/kepsek/SpvcNarrativeForm'
import LaporanRtlForm from '@/src/components/dashboard/kepsek/LaporanRtlForm'
import { SPVC_FORMS, type SpvcColumn } from '@/src/lib/spvc-forms'
import type {
  Schedule,
  SupervisionReport,
  SchoolSettings,
  SpvcData,
} from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatJadwalLabel(s: {
  subject: string
  class_name: string
  scheduled_date: string
}): string {
  const date = new Date(s.scheduled_date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${s.subject} · ${s.class_name} · ${date}`
}

const STATUS_BADGE: Record<
  SupervisionReport['status'],
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: {
    label: 'Published',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
}

/**
 * Isi awal formulir SPVC. Khusus SPVC-05, bila belum pernah disimpan namun
 * laporan masih menyimpan catatan lama (strengths/improvements), isian lama
 * dipakai sebagai prefill agar tidak perlu ketik ulang.
 */
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

export default async function KepsekLaporanDetailPage({
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

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: laporan } = (await supabase
    .from('supervision_reports')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: SupervisionReport | null }

  if (!laporan) notFound()
  if (laporan.supervisor_id !== user.id) redirect('/dashboard/kepsek/laporan')

  const [
    { data: supervisorProfile },
    { data: gurus },
    { data: jadwalSelesai },
    { data: schoolSettingsRaw },
  ] = (await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('id, full_name, nip').eq('role', 'guru').order('full_name'),
    supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('supervisor_id', user.id)
      .eq('status', 'selesai')
      .order('scheduled_date', { ascending: false }),
    supabase.from('school_settings').select('*').single(),
  ])) as unknown as [
    { data: { full_name: string } | null },
    { data: { id: string; full_name: string; nip: string | null }[] | null },
    { data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null },
    { data: SchoolSettings | null },
  ]

  const guruOptions = (gurus ?? []).map((g) => ({ id: g.id, full_name: g.full_name, nip: g.nip }))
  const jadwalOptions = (jadwalSelesai ?? []).map((j) => ({
    id: j.id,
    label: formatJadwalLabel(j),
  }))
  const supervisorName = supervisorProfile?.full_name ?? ''
  const schoolSettings = schoolSettingsRaw ?? null

  // Find teacher info for print view
  const teacher = guruOptions.find((g) => g.id === laporan.teacher_id)
  const teacherName = teacher?.full_name ?? '—'
  const teacherNip = teacher?.nip ?? null

  const badge = STATUS_BADGE[laporan.status]

  return (
    <>
      {/* ── Screen UI (hidden when printing) ─────────────────────────────────── */}
      <div className="flex h-screen print:hidden">
        <KepsekSidebar />

        <div className="flex-1 bg-slate-50 overflow-y-auto">
          <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900 truncate">
                    {laporan.subject} · {laporan.class_name}
                  </h1>
                  <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
                    {formatDate(laporan.visit_date)}
                  </p>
                </div>
                <span
                  className={`inline-block font-body text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <PrintButton />
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-5">
            <div className="mb-1">
              <Link
                href="/dashboard/kepsek/laporan"
                className="inline-flex items-center gap-1.5 font-body text-sm text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Laporan Supervisi
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
              <LaporanForm
                mode="edit"
                initialData={laporan}
                guruOptions={guruOptions}
                jadwalOptions={jadwalOptions}
                supervisorName={supervisorName}
              />
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
              />
            ))}

            <LaporanRtlForm
              reportId={laporan.id}
              initialItems={laporan.rtl_items}
              legacyRecommendation={laporan.recommendations}
            />

            {SPVC_FORMS.filter((d) => d.column === 'spvc09').map((def) => (
              <SpvcNarrativeForm
                key={def.column}
                reportId={laporan.id}
                def={def}
                initialData={spvcInitial(laporan, def.column)}
              />
            ))}

            <LaporanDokumentasi
              reportId={laporan.id}
              initialDocs={laporan.documentation_urls}
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
              <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Tindakan</h2>
              <LaporanDetailActions reportId={laporan.id} status={laporan.status} />
            </div>
          </main>
        </div>
      </div>

      {/* ── Print view (only shown when printing) ────────────────────────────── */}
      <div className="hidden print:block">
        <LaporanPrintView
          laporan={laporan}
          teacherName={teacherName}
          teacherNip={teacherNip}
          supervisorName={supervisorName}
          schoolSettings={schoolSettings}
        />
      </div>
    </>
  )
}
