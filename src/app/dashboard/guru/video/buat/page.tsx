import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import VideoForm from '@/src/components/dashboard/guru/VideoForm'
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

export default async function GuruVideoBuatPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: schedules } = (await supabase
    .from('schedules')
    .select('id, subject, class_name, scheduled_date')
    .eq('teacher_id', user.id)
    .order('scheduled_date', { ascending: false })) as unknown as {
    data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null
  }

  const jadwalOptions = (schedules ?? []).map((s) => ({
    id: s.id,
    label: formatJadwalLabel(s),
  }))

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <Link
            href="/dashboard/guru/video"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Video Mengajar
          </Link>
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Kirim Video Mengajar
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Tempel link video rekaman mengajar Anda untuk ditinjau kepala sekolah.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <VideoForm mode="create" jadwalOptions={jadwalOptions} />
          </div>
        </main>
      </div>
    </div>
  )
}
