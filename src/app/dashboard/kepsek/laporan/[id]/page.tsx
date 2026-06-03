import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import LaporanForm from '@/src/components/dashboard/kepsek/LaporanForm'
import LaporanDetailActions from '@/src/components/dashboard/kepsek/LaporanDetailActions'
import type { Schedule, SupervisionReport } from '@/src/types/database'

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

  const [{ data: gurus }, { data: jadwalSelesai }] = (await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'guru').order('full_name'),
    supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('supervisor_id', user.id)
      .eq('status', 'selesai')
      .order('scheduled_date', { ascending: false }),
  ])) as unknown as [
    { data: { id: string; full_name: string }[] | null },
    { data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null },
  ]

  const guruOptions = (gurus ?? []).map((g) => ({ id: g.id, full_name: g.full_name }))
  const jadwalOptions = (jadwalSelesai ?? []).map((j) => ({
    id: j.id,
    label: formatJadwalLabel(j),
  }))

  const badge = STATUS_BADGE[laporan.status]

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
                {laporan.subject} · {laporan.class_name}
              </h1>
              <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
                {formatDate(laporan.visit_date)}
              </p>
            </div>
            <span
              className={`inline-block font-body text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Edit Laporan</h2>
            <LaporanForm
              mode="edit"
              initialData={laporan}
              guruOptions={guruOptions}
              jadwalOptions={jadwalOptions}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Tindakan</h2>
            <LaporanDetailActions reportId={laporan.id} status={laporan.status} />
          </div>
        </main>
      </div>
    </div>
  )
}
