import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, ExternalLink, User } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import VideoReviewForm from '@/src/components/dashboard/kepsek/VideoReviewForm'
import type { TeachingVideo, VideoStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface VideoDetail extends TeachingVideo {
  guru_name: string | null
}

const STATUS_BADGE: Record<VideoStatus, { label: string; className: string }> = {
  belum_ditinjau: {
    label: 'Belum Ditinjau',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  sudah_ditinjau: {
    label: 'Sudah Ditinjau',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function KepsekVideoDetailPage({
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

  const { data: videoBase } = (await supabase
    .from('teaching_videos')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: TeachingVideo | null }

  if (!videoBase) notFound()

  const { data: guru } = (await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', videoBase.teacher_id)
    .maybeSingle()) as unknown as { data: { full_name: string } | null }

  const video: VideoDetail = { ...videoBase, guru_name: guru?.full_name ?? null }
  const badge = STATUS_BADGE[video.status]

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <Link
            href="/dashboard/kepsek/video"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Video Mengajar
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900 truncate">
              {video.title}
            </h1>
            <span
              className={`inline-block w-fit font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 md:px-6 md:py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[11px] text-slate-400 uppercase tracking-wider">
                      Pengirim
                    </p>
                    <p className="font-body text-sm font-semibold text-slate-800 truncate">
                      {video.guru_name ?? 'Tidak diketahui'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-[11px] text-slate-400 uppercase tracking-wider">
                      Dikirim
                    </p>
                    <p className="font-body text-sm font-semibold text-slate-800">
                      {formatDate(video.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <section className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 md:px-6 py-3.5 border-b border-slate-100">
                  <h3 className="font-heading text-base font-bold text-[#002147]">
                    Detail Video
                  </h3>
                </div>
                <div className="px-5 md:px-6 py-4 md:py-5 space-y-4">
                  <div>
                    <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      Mata Pelajaran · Kelas
                    </p>
                    <p className="font-body text-sm text-slate-800 mt-1">
                      {video.subject} · {video.class_name}
                    </p>
                  </div>
                  {video.teacher_note && (
                    <div>
                      <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                        Catatan Pengantar Guru
                      </p>
                      <p className="font-body text-sm text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                        {video.teacher_note}
                      </p>
                    </div>
                  )}
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Tonton Video
                  </a>
                </div>
              </section>
            </div>

            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <VideoReviewForm
                  videoId={video.id}
                  currentStatus={video.status}
                  initialKepsekNote={video.kepsek_note ?? ''}
                />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}
