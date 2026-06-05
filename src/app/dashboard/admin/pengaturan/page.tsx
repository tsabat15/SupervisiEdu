import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import AdminSidebar from '@/src/components/dashboard/AdminSidebar'
import SchoolSettingsForm from '@/src/components/dashboard/admin/SchoolSettingsForm'
import type { SchoolSettings } from '@/src/types/database'

export const dynamic = 'force-dynamic'

const DEFAULT_SETTINGS: SchoolSettings = {
  id: 1,
  school_name: '',
  header_line_1: '',
  header_line_2: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: null,
  updated_at: new Date(0).toISOString(),
}

export default async function PengaturanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string; full_name: string } | null }

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: settings, error } = (await supabase
    .from('school_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()) as unknown as {
    data: SchoolSettings | null
    error: { message?: string } | null
  }

  if (error) {
    console.error(
      '[admin/pengaturan] school_settings query error:',
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    )
  }

  const initial = settings ?? DEFAULT_SETTINGS

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Pengaturan Sekolah
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Identitas sekolah untuk kop laporan dan dokumen.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full">
          {!settings && (
            <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="font-body text-sm text-amber-800">
                Belum ada baris di tabel <code>school_settings</code>. Pastikan migrasi SQL sudah
                dijalankan untuk membuat tabel + seed baris tunggal.
              </p>
            </div>
          )}

          <SchoolSettingsForm initial={initial} />
        </main>
      </div>
    </div>
  )
}
