import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import KepsekJadwalClient from '@/src/components/dashboard/kepsek/KepsekJadwalClient'
import type { Schedule } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface ScheduleRow extends Schedule {
  teacher_name: string | null
}

export default async function KepsekJadwalPage() {
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

  const [{ data: rawSchedules }, { data: gurus }] = (await Promise.all([
    supabase
      .from('schedules')
      .select('*')
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'guru')
      .order('full_name'),
  ])) as unknown as [
    { data: Schedule[] | null },
    { data: { id: string; full_name: string }[] | null },
  ]

  const guruOptions = gurus ?? []
  const guruMap = new Map(guruOptions.map((g) => [g.id, g.full_name]))

  const schedules: ScheduleRow[] = (rawSchedules ?? []).map((s) => ({
    ...s,
    teacher_name: guruMap.get(s.teacher_id) ?? null,
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Pengelolaan Jadwal
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Atur jadwal supervisi untuk guru.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <KepsekJadwalClient
            initialSchedules={schedules}
            guruOptions={guruOptions}
          />
        </main>
      </div>
    </div>
  )
}
