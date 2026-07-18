import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, User } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import RmpReviewPanel from '@/src/components/dashboard/kepsek/RmpReviewPanel'
import type { RmpForm, RmpStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface RmpDetail extends RmpForm {
  guru_name: string | null
  guru_nip: string | null
}

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  revision: { label: 'Revisi', className: 'bg-red-50 text-red-700 border border-red-200' },
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function KepsekRmpDetailPage({
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

  const { data: rmpBase, error: rmpError } = (await supabase
    .from('rmp_forms')
    .select('*')
    .eq('id', id)
    .single()) as unknown as {
    data: RmpForm | null
    error: { message: string } | null
  }

  if (rmpError) console.error('[kepsek/rmp/detail] rmp error:', rmpError)
  if (!rmpBase) notFound()

  const { data: guru } = (await supabase
    .from('profiles')
    .select('full_name, nip')
    .eq('id', rmpBase.guru_id)
    .maybeSingle()) as unknown as {
    data: { full_name: string; nip: string | null } | null
  }

  const rmp: RmpDetail = {
    ...rmpBase,
    guru_name: guru?.full_name ?? null,
    guru_nip: guru?.nip ?? null,
  }

  const badge = STATUS_BADGE[rmp.status] ?? STATUS_BADGE.submitted
  const canReview = rmp.status !== 'draft'

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <Link
            href="/dashboard/kepsek/rmp"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-slate-500 hover:text-[#002147] transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Daftar RMP
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

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <MetaCard rmp={rmp} />

              <Section title="Informasi Umum">
                <Field label="Judul Projek" value={rmp.judul} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Tema Projek" value={rmp.tema} />
                  <Field label="Fase" value={rmp.fase} />
                </div>
                <Field label="Kelas" value={rmp.kelas} />
              </Section>

              <Section title="Tujuan Projek">
                <ListField
                  label="Dimensi Profil Lulusan"
                  items={rmp.dimensi_p5 ?? []}
                />
                <ListField label="Elemen / Fokus yang Disasar" items={rmp.elemen_p5 ?? []} />
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

              {rmp.catatan_kepsek && rmp.status !== 'submitted' && (
                <Section title="Catatan Sebelumnya">
                  <div className="rounded-lg bg-amber-50/60 border border-amber-200 px-4 py-3">
                    <p className="font-body text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {rmp.catatan_kepsek}
                    </p>
                    {rmp.reviewed_at && (
                      <p className="font-body text-xs text-slate-500 mt-2">
                        Ditinjau pada {formatDate(rmp.reviewed_at)}
                      </p>
                    )}
                  </div>
                </Section>
              )}
            </div>

            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                {canReview ? (
                  <RmpReviewPanel
                    rmpId={rmp.id}
                    currentStatus={rmp.status as 'submitted' | 'revision' | 'approved'}
                    initialCatatan={rmp.catatan_kepsek ?? ''}
                    initialCeklis={rmp.admin_ceklis ?? []}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 px-5 py-5">
                    <p className="font-body text-sm text-slate-500">
                      RMP ini masih dalam status draft dan belum dapat ditinjau.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

function MetaCard({ rmp }: { rmp: RmpDetail }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 md:px-6 md:py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="font-body text-[11px] text-slate-400 uppercase tracking-wider">Pengirim</p>
          <p className="font-body text-sm font-semibold text-slate-800 truncate">
            {rmp.guru_name ?? 'Tidak diketahui'}
          </p>
          {rmp.guru_nip && (
            <p className="font-body text-xs text-slate-500 font-mono">{rmp.guru_nip}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="font-body text-[11px] text-slate-400 uppercase tracking-wider">
            Diperbarui
          </p>
          <p className="font-body text-sm font-semibold text-slate-800">
            {formatDate(rmp.updated_at)}
          </p>
        </div>
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
