import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import AdminSidebar from '@/src/components/dashboard/AdminSidebar'
import AdminRmpClient, {
  type AdminRmpRow,
  type DeletionReqRow,
} from '@/src/components/dashboard/admin/AdminRmpClient'
import type { RmpStatus } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface RmpBase {
  id: string
  judul: string
  tema: string
  status: RmpStatus
  guru_id: string
  created_at: string
  updated_at: string
}

interface ReqBase {
  id: string
  rmp_id: string
  guru_id: string
  reason: string
  created_at: string
}

export default async function AdminRmpPage() {
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

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [{ data: rmpData }, { data: reqData }] = (await Promise.all([
    supabase
      .from('rmp_forms')
      .select('id, judul, tema, status, guru_id, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('rmp_deletion_requests')
      .select('id, rmp_id, guru_id, reason, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])) as unknown as [{ data: RmpBase[] | null }, { data: ReqBase[] | null }]

  const rmpBase = rmpData ?? []
  const reqBase = reqData ?? []

  const allGuruIds = Array.from(
    new Set([...rmpBase.map((r) => r.guru_id), ...reqBase.map((r) => r.guru_id)]),
  )

  let nameMap = new Map<string, string>()
  if (allGuruIds.length > 0) {
    const { data: gurus } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allGuruIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    nameMap = new Map((gurus ?? []).map((g) => [g.id, g.full_name]))
  }

  const judulMap = new Map(rmpBase.map((r) => [r.id, r.judul]))

  const pendingByRmp: Record<string, string> = {}
  for (const r of reqBase) pendingByRmp[r.rmp_id] = r.id

  const rmps: AdminRmpRow[] = rmpBase.map((r) => ({
    ...r,
    guru_name: nameMap.get(r.guru_id) ?? null,
  }))

  const requests: DeletionReqRow[] = reqBase.map((r) => ({
    ...r,
    guru_name: nameMap.get(r.guru_id) ?? null,
    judul: judulMap.get(r.rmp_id) ?? '',
  }))

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Kelola Semua RMP
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Tinjau permintaan hapus dari guru atau hapus modul langsung sebagai admin.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto w-full">
          <AdminRmpClient rmps={rmps} requests={requests} pendingByRmp={pendingByRmp} />
        </main>
      </div>
    </div>
  )
}
