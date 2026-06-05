import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Calendar, CheckCircle2, Clock, FileEdit, Plus } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { Profile, RmpForm, Schedule } from '@/src/types/database'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<RmpForm['status'], string> = {
  draft: 'Draft',
  submitted: 'Menunggu Review',
  approved: 'Disetujui',
  revision: 'Perlu Revisi',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default async function GuruBerandaPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as unknown as { data: Profile | null }

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: rmpList }, { data: schedules }, { data: recentActivity }] = await Promise.all([
    supabase.from('rmp_forms').select('status').eq('guru_id', user.id),
    supabase
      .from('schedules')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('status', 'dijadwalkan')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(3),
    supabase
      .from('rmp_forms')
      .select('id, judul, status, updated_at')
      .eq('guru_id', user.id)
      .in('status', ['approved', 'revision', 'submitted'])
      .order('updated_at', { ascending: false })
      .limit(4),
  ])

  const rmpRows = (rmpList ?? []) as Pick<RmpForm, 'status'>[]
  const counts = {
    draft: rmpRows.filter((r) => r.status === 'draft').length,
    submitted: rmpRows.filter((r) => r.status === 'submitted').length,
    approved: rmpRows.filter((r) => r.status === 'approved').length,
  }

  const upcoming = (schedules ?? []) as Schedule[]
  const activity = (recentActivity ?? []) as Pick<RmpForm, 'id' | 'judul' | 'status' | 'updated_at'>[]

  const statusCards = [
    {
      label: 'Draft',
      value: counts.draft,
      icon: FileEdit,
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-100',
      accent: 'border-l-slate-300',
    },
    {
      label: 'Menunggu Review',
      value: counts.submitted,
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accent: 'border-l-amber-400',
    },
    {
      label: 'Disetujui',
      value: counts.approved,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      accent: 'border-l-emerald-400',
    },
  ]

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Beranda</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5 truncate">
            Selamat datang kembali, {profile?.full_name ?? 'Guru'}.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
          <section className="rounded-xl bg-gradient-to-r from-[#002147] to-[#0a3370] px-5 py-5 md:px-7 md:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div>
              <p className="font-body text-xs font-semibold text-amber-300/90 tracking-widest uppercase">
                Aksi Cepat
              </p>
              <h2 className="font-heading text-2xl font-bold text-white mt-1">
                Mulai modul projek baru
              </h2>
              <p className="font-body text-sm text-white/65 mt-1">
                Rancang Rencana Modul Projek dengan panduan terstruktur.
              </p>
            </div>
            <Link
              href="/dashboard/guru/rmp/buat"
              className="inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 transition shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Buat RMP Baru
            </Link>
          </section>

          <section>
            <h3 className="font-heading text-base font-bold text-slate-900 mb-3">Status RMP</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statusCards.map(({ label, value, icon: Icon, iconColor, iconBg, accent }) => (
                <div
                  key={label}
                  className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accent} px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-amber-300 transition`}
                >
                  <div className={`w-11 h-11 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div>
                    <p className="font-body text-xs text-slate-500 font-medium">{label}</p>
                    <p className="font-heading text-2xl font-bold text-slate-900 leading-tight">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 hover:border-amber-300 transition">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    Jadwal Terdekat
                  </h3>
                </div>
                <Link
                  href="/dashboard/guru/jadwal"
                  className="font-body text-xs font-semibold text-amber-600 hover:text-amber-700"
                >
                  Lihat semua
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="font-body text-sm text-slate-500">
                    Tidak ada jadwal dalam waktu dekat
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((s) => (
                    <li key={s.id} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-12 text-center shrink-0">
                        <p className="font-heading text-xl font-bold text-[#002147] leading-none">
                          {new Date(s.scheduled_date).getDate()}
                        </p>
                        <p className="font-body text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                          {new Date(s.scheduled_date).toLocaleDateString('id-ID', {
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-semibold text-slate-900 truncate">
                          {s.subject} &middot; {s.class_name}
                        </p>
                        <p className="font-body text-xs text-slate-500 mt-0.5">
                          {formatDate(s.scheduled_date)} &middot; {s.scheduled_time.slice(0, 5)}
                        </p>
                      </div>
                      <span className="font-body text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Dijadwalkan
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 transition">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Aktivitas Terbaru
                </h3>
              </div>

              {activity.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="font-body text-sm text-slate-500">Belum ada aktivitas.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {activity.map((item) => {
                    const dotColor =
                      item.status === 'approved'
                        ? 'bg-emerald-500'
                        : item.status === 'revision'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                    return (
                      <li key={item.id} className="px-6 py-3 flex items-start gap-3">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                        <div className="min-w-0">
                          <p className="font-body text-sm text-slate-800 leading-snug">
                            Modul{' '}
                            <span className="font-semibold">
                              {item.judul || 'Tanpa Judul'}
                            </span>{' '}
                            <span className="text-slate-500">
                              berstatus {STATUS_LABELS[item.status].toLowerCase()}.
                            </span>
                          </p>
                          <p className="font-body text-[11px] text-slate-400 mt-0.5">
                            {formatRelative(item.updated_at)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
