import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import LaporanForm from '@/src/components/dashboard/kepsek/LaporanForm'
import type { Schedule } from '@/src/types/database'

export const dynamic = 'force-dynamic'

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

export default async function KepsekLaporanBuatPage() {
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

  const [{ data: supervisorProfile }, { data: gurus }, { data: jadwalSelesai }] = (await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('id, full_name, nip').eq('role', 'guru').order('full_name'),
    supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('supervisor_id', user.id)
      .eq('status', 'selesai')
      .order('scheduled_date', { ascending: false }),
  ])) as unknown as [
    { data: { full_name: string } | null },
    { data: { id: string; full_name: string; nip: string | null }[] | null },
    { data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null },
  ]

  const guruOptions = (gurus ?? []).map((g) => ({ id: g.id, full_name: g.full_name, nip: g.nip }))
  const jadwalOptions = (jadwalSelesai ?? []).map((j) => ({
    id: j.id,
    label: formatJadwalLabel(j),
  }))
  const supervisorName = supervisorProfile?.full_name ?? ''

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Buat Laporan Supervisi
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Isi formulir laporan hasil observasi.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full">
          <div className="mb-4">
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
              mode="create"
              guruOptions={guruOptions}
              jadwalOptions={jadwalOptions}
              supervisorName={supervisorName}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
