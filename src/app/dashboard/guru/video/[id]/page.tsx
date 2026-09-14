import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, MessageSquareText } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import VideoForm from '@/src/components/dashboard/guru/VideoForm'
import type { TeachingVideo, Schedule, VideoStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

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

function formatDateTime(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export default async function GuruVideoDetailPage({
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

  const { data: video } = (await supabase
    .from('teaching_videos')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: TeachingVideo | null }

  if (!video || video.teacher_id !== user.id) notFound()

  const badge = STATUS_BADGE[video.status]
  const isEditable = video.status === 'belum_ditinjau'

  let jadwalOptions: { id: string; label: string }[] = []
  if (isEditable) {
    const { data: schedules } = (await supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('teacher_id', user.id)
      .order('scheduled_date', { ascending: false })) as unknown as {
      data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null
    }
    jadwalOptions = (schedules ?? []).map((s) => ({ id: s.id, label: formatJadwalLabel(s) }))
  }

  let reviewerName: string | null = null
  if (video.reviewed_by) {
    const { data: reviewer } = (await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', video.reviewed_by)
      .maybeSingle()) as unknown as { data: { full_name: string } | null }
    reviewerName = reviewer?.full_name ?? null
  }

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

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full space-y-5">
          {video.kepsek_note && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/40">
              <div className="px-5 md:px-6 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-amber-700 shrink-0" />
                <h3 className="font-heading text-base font-bold text-[#002147]">
                  Catatan Kepala Sekolah
                </h3>
              </div>
              <div className="px-5 md:px-6 py-4 md:py-5">
                <p className="font-body text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {video.kepsek_note}
                </p>
                {(reviewerName || video.reviewed_at) && (
                  <p className="font-body text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/70">
                    Ditinjau oleh{' '}
                    <span className="font-semibold text-slate-700">
                      {reviewerName ?? 'kepala sekolah'}
                    </span>
                    {video.reviewed_at && <> · {formatDateTime(video.reviewed_at)}</>}
                  </p>
                )}
              </div>
            </section>
          )}

          {isEditable ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
              <VideoForm mode="edit" initialData={video} jadwalOptions={jadwalOptions} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5 space-y-4">
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
                    Catatan Pengantar Anda
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] border border-[#002147]/20 hover:bg-[#002147]/5 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Buka Video
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
