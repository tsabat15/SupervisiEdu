import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import KepsekVideoListClient, {
  type KepsekVideoRow,
} from '@/src/components/dashboard/kepsek/KepsekVideoListClient'
import type { VideoStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface VideoBase {
  id: string
  title: string
  subject: string
  class_name: string
  status: VideoStatus
  created_at: string
  teacher_id: string
}

export default async function KepsekVideoListPage() {
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

  const { data: videos } = (await supabase
    .from('teaching_videos')
    .select('id, title, subject, class_name, status, created_at, teacher_id')
    .order('created_at', { ascending: false })) as unknown as { data: VideoBase[] | null }

  const baseRows = videos ?? []
  const teacherIds = Array.from(new Set(baseRows.map((v) => v.teacher_id)))

  let guruMap = new Map<string, string>()
  if (teacherIds.length > 0) {
    const { data: gurus } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds)) as unknown as { data: { id: string; full_name: string }[] | null }
    guruMap = new Map((gurus ?? []).map((g) => [g.id, g.full_name]))
  }

  const rows: KepsekVideoRow[] = baseRows.map((v) => ({
    ...v,
    guru_name: guruMap.get(v.teacher_id) ?? null,
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Video Mengajar
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            {rows.length} video terkirim dari guru
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <KepsekVideoListClient rows={rows} />
        </main>
      </div>
    </div>
  )
}
