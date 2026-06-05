import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, Eye } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import RmpPdfDownloadButton from '@/src/components/dashboard/RmpPdfDownloadButton'
import type { RmpStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface RmpBase {
  id: string
  judul: string
  tema: string
  status: RmpStatus
  updated_at: string
  guru_id: string
}

interface ReviewRow extends RmpBase {
  guru_name: string | null
}

const STATUS_BADGE: Record<RmpStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  revision: { label: 'Revisi', className: 'bg-red-50 text-red-700 border border-red-200' },
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function KepsekRmpListPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rmpData, error: rmpError } = (await supabase
    .from('rmp_forms')
    .select('id, judul, tema, status, updated_at, guru_id')
    .in('status', ['submitted', 'revision', 'approved'])
    .order('updated_at', { ascending: false })) as unknown as {
    data: RmpBase[] | null
    error: { message?: string; code?: string; details?: string; hint?: string } | null
  }

  if (rmpError) {
    console.error(
      '[kepsek/rmp] rmp_forms query error:',
      JSON.stringify(rmpError, Object.getOwnPropertyNames(rmpError)),
    )
  }

  const baseRows = rmpData ?? []
  const guruIds = Array.from(new Set(baseRows.map((r) => r.guru_id)))

  let guruMap = new Map<string, string>()
  if (guruIds.length > 0) {
    const { data: gurus, error: guruError } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', guruIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
      error: { message: string } | null
    }
    if (guruError) console.error('[kepsek/rmp] profiles query error:', guruError)
    guruMap = new Map((gurus ?? []).map((g) => [g.id, g.full_name]))
  }

  const rows: ReviewRow[] = baseRows.map((r) => ({
    ...r,
    guru_name: guruMap.get(r.guru_id) ?? null,
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Tinjau RMP Guru
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            {rows.length} modul tersedia untuk ditinjau
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 mx-auto flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h2 className="font-heading text-lg font-bold text-slate-800 mb-1">
                Belum ada RMP untuk ditinjau
              </h2>
              <p className="font-body text-sm text-slate-500 max-w-sm mx-auto">
                Modul yang dikirim guru akan muncul di sini untuk Anda nilai.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-[#002147]">
                    <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                      Judul Projek
                    </th>
                    <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                      Pengirim
                    </th>
                    <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                      Tema
                    </th>
                    <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                      Status
                    </th>
                    <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">
                      Diperbarui
                    </th>
                    <th className="px-5 md:px-6 py-3.5 w-32" aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((rmp) => {
                    const badge = STATUS_BADGE[rmp.status] ?? STATUS_BADGE.submitted
                    return (
                      <tr key={rmp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 md:px-6 py-4">
                          <p className="font-body font-medium text-slate-800">
                            {rmp.judul || (
                              <span className="italic text-slate-400">Tanpa Judul</span>
                            )}
                          </p>
                        </td>
                        <td className="px-5 md:px-6 py-4 font-body text-slate-700">
                          {rmp.guru_name ?? (
                            <span className="text-slate-400">Tidak diketahui</span>
                          )}
                        </td>
                        <td className="px-5 md:px-6 py-4 font-body text-slate-600">
                          {rmp.tema || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-5 md:px-6 py-4">
                          <span
                            className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 md:px-6 py-4 font-body text-slate-500 text-xs">
                          {formatDate(rmp.updated_at)}
                        </td>
                        <td className="px-5 md:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {rmp.status === 'approved' && (
                              <RmpPdfDownloadButton
                                rmpId={rmp.id}
                                judul={rmp.judul || 'RMP'}
                                variant="pill"
                              />
                            )}
                            <Link
                              href={`/dashboard/kepsek/rmp/${rmp.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-[#002147] bg-[#D4AF37] hover:bg-[#E5C158] transition whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Tinjau RMP
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
