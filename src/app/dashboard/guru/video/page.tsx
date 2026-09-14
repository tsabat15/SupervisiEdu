import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import VideoListClient, { type VideoRow } from '@/src/components/dashboard/guru/VideoListClient'

export const dynamic = 'force-dynamic'

export default async function GuruVideoPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = (await supabase
    .from('teaching_videos')
    .select('id, title, subject, class_name, status, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })) as unknown as { data: VideoRow[] | null }

  const rows = data ?? []

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
              Video Mengajar
            </h1>
            <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
              {rows.length} video terkirim
            </p>
          </div>

          <Link
            href="/dashboard/guru/video/buat"
            className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Kirim Video Baru
          </Link>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <VideoListClient rows={rows} />
        </main>
      </div>
    </div>
  )
}
