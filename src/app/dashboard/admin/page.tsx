import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, FileText, Plus, Settings, Users } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import AdminSidebar from '@/src/components/dashboard/AdminSidebar'

export default async function AdminDashboardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: profile },
    { count: totalGuru },
    { count: totalLaporan },
    { count: menungguReview },
  ] = (await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'guru'),
    supabase
      .from('supervision_reports')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('supervision_reports')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'submitted']),
  ])) as unknown as [
    { data: { full_name: string } | null },
    { count: number | null },
    { count: number | null },
    { count: number | null },
  ]

  const metrics = [
    {
      label: 'Total Guru',
      value: totalGuru ?? 0,
      icon: Users,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      trend: 'Guru terdaftar di sistem',
    },
    {
      label: 'Total Laporan',
      value: totalLaporan ?? 0,
      icon: FileText,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      trend: 'Laporan supervisi masuk',
    },
    {
      label: 'Menunggu Review',
      value: menungguReview ?? 0,
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      trend: 'Laporan belum ditinjau',
    },
  ]

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
              Beranda
            </h1>
            <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5 truncate">
              Selamat datang,{' '}
              <span className="font-semibold text-slate-700">
                {profile?.full_name ?? 'Administrator'}
              </span>
            </p>
          </div>

          <Link
            href="/dashboard/admin/pengguna"
            className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna Baru
          </Link>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <section>
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4 md:mb-5">
              Ringkasan Sistem
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
              {metrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <div
                    key={metric.label}
                    className="bg-white rounded-xl border border-amber-200/60 shadow-md p-5 md:p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm font-medium text-slate-500">
                        {metric.label}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-lg ${metric.iconBg} flex items-center justify-center`}
                      >
                        <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                      </div>
                    </div>
                    <div>
                      <p className="font-heading text-3xl font-bold text-slate-900">
                        {metric.value.toLocaleString('id-ID')}
                      </p>
                      <p className="font-body text-xs text-slate-400 mt-1">
                        {metric.trend}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-8 md:mt-10">
            <h2 className="font-heading text-base md:text-lg font-semibold text-slate-900 mb-4 md:mb-5">
              Aksi Cepat
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/admin/pengguna"
                className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 flex items-center gap-4 hover:border-amber-300 hover:shadow-md transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#002147] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-slate-900 group-hover:text-[#002147]">
                    Kelola Pengguna
                  </p>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Tambah, edit, atau hapus akun guru & kepsek
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/admin/pengaturan"
                className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 flex items-center gap-4 hover:border-amber-300 hover:shadow-md transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#002147] flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-slate-900 group-hover:text-[#002147]">
                    Pengaturan Sekolah
                  </p>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Nama sekolah, alamat, dan informasi kelembagaan
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
