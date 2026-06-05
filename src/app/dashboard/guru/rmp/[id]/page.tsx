import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Edit } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import RmpRealtimeWatcher from '@/src/components/dashboard/guru/RmpRealtimeWatcher'
import CatatanKepsekCard from '@/src/components/dashboard/guru/CatatanKepsekCard'
import type { RmpForm, RmpStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: {
    label: 'Menunggu Review',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'Disetujui',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  revision: { label: 'Revisi', className: 'bg-red-50 text-red-700 border border-red-200' },
}

const STATUS_BANNER: Record<
  RmpStatus,
  { icon: typeof Clock; iconColor: string; bg: string; border: string; title: string; sub: string } | null
> = {
  draft: {
    icon: Edit,
    iconColor: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    title: 'Draft tersimpan',
    sub: 'Modul ini masih draft. Anda dapat melanjutkan menyusun atau mengirim untuk ditinjau.',
  },
  submitted: {
    icon: Clock,
    iconColor: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'Menunggu review kepala sekolah',
    sub: 'Anda akan menerima notifikasi setelah kepala sekolah meninjau modul ini.',
  },
  approved: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    title: 'Modul telah disetujui',
    sub: 'Modul ini sudah resmi disetujui kepala sekolah dan dapat diunduh sebagai PDF.',
  },
  revision: {
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    title: 'Modul perlu direvisi',
    sub: 'Kepala sekolah meminta perbaikan. Baca catatan di bawah, lalu sunting kembali modul ini.',
  },
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function GuruRmpDetailPage({
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

  const { data: rmp } = (await supabase
    .from('rmp_forms')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: RmpForm | null }

  if (!rmp) notFound()
  if (rmp.guru_id !== user.id) redirect('/dashboard/guru/rmp')

  let reviewerName: string | null = null
  if (rmp.reviewed_by) {
    const { data: reviewer } = (await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', rmp.reviewed_by)
      .maybeSingle()) as unknown as { data: { full_name: string } | null }
    reviewerName = reviewer?.full_name ?? null
  }

  const badge = STATUS_BADGE[rmp.status]
  const banner = STATUS_BANNER[rmp.status]
  const hasCatatan = Boolean(rmp.catatan_kepsek?.trim())

  return (
    <div className="flex h-screen">
      <GururSidebar />
      <RmpRealtimeWatcher rmpId={rmp.id} />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <Link
            href="/dashboard/guru/rmp"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke RMP Saya
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900 truncate">
              {rmp.judul || 'Tanpa Judul'}
            </h1>
            <span
              className={`inline-block w-fit font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto w-full space-y-5">
          {banner && <StatusBanner banner={banner} />}

          {(hasCatatan || rmp.status === 'revision' || rmp.status === 'approved') && (
            <CatatanKepsekCard
              catatan={rmp.catatan_kepsek}
              reviewerName={reviewerName}
              reviewedAt={rmp.reviewed_at}
              status={rmp.status}
            />
          )}

          {rmp.status === 'draft' && (
            <div className="flex">
              <Link
                href="/dashboard/guru/rmp/buat"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 transition"
              >
                <Edit className="w-4 h-4" />
                Lanjutkan Edit Draft
              </Link>
            </div>
          )}

          <Section title="Informasi Umum">
            <Field label="Judul Projek" value={rmp.judul} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tema P5" value={rmp.tema} />
              <Field label="Fase" value={rmp.fase} />
            </div>
            <Field label="Kelas" value={rmp.kelas} />
          </Section>

          <Section title="Tujuan Projek">
            <ListField
              label="Dimensi Profil Pelajar Pancasila"
              items={rmp.dimensi_p5 ?? []}
            />
            <ListField label="Elemen yang Disasar" items={rmp.elemen_p5 ?? []} />
          </Section>

          <Section title="Alur Aktivitas">
            <Field label="Tahap Pengenalan" value={rmp.aktivitas_pengenalan} />
            <Field label="Tahap Kontekstualisasi" value={rmp.aktivitas_kontekstual} />
            <Field label="Tahap Aksi" value={rmp.aktivitas_aksi} />
            <Field label="Tahap Refleksi" value={rmp.aktivitas_refleksi} />
          </Section>

          <Section title="Asesmen">
            {rmp.asesmen_awal ? (
              <Field label="Asesmen Awal" value={rmp.asesmen_awal} />
            ) : null}
            <Field label="Asesmen Formatif" value={rmp.asesmen_formatif} />
            <Field label="Asesmen Sumatif" value={rmp.asesmen_sumatif} />
          </Section>

          <div className="font-body text-xs text-slate-400 text-center pt-2">
            Dibuat {formatDateTime(rmp.created_at)} · Diperbarui{' '}
            {formatDateTime(rmp.updated_at)}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatusBanner({
  banner,
}: {
  banner: NonNullable<(typeof STATUS_BANNER)[RmpStatus]>
}) {
  const Icon = banner.icon
  return (
    <div className={`rounded-xl ${banner.bg} ${banner.border} border px-4 py-3 flex items-start gap-3`}>
      <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shrink-0">
        <Icon className={`w-4 h-4 ${banner.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-slate-900">{banner.title}</p>
        <p className="font-body text-xs text-slate-600 mt-0.5 leading-relaxed">{banner.sub}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 md:px-6 py-3.5 border-b border-slate-100">
        <h3 className="font-heading text-base font-bold text-[#002147]">{title}</h3>
      </div>
      <div className="px-5 md:px-6 py-4 md:py-5 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  const text = value?.trim()
  return (
    <div>
      <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`font-body text-sm mt-1 whitespace-pre-wrap leading-relaxed ${
          text ? 'text-slate-800' : 'italic text-slate-400'
        }`}
      >
        {text || 'Belum diisi'}
      </p>
    </div>
  )
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-body text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="font-body text-sm italic text-slate-400 mt-1">Belum diisi</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-start gap-2 font-body text-sm text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
