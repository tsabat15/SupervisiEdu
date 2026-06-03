'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, BookOpen, Home, LogOut, Menu, Settings, UserCircle, Users, X } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'

const navItems = [
  { label: 'Beranda', href: '/dashboard/admin', icon: Home },
  { label: 'Kelola Pengguna', href: '/dashboard/admin/pengguna', icon: Users },
  { label: 'Kelola RMP', href: '/dashboard/admin/rmp', icon: BookOpen },
  { label: 'Data Supervisi', href: '/dashboard/admin/supervisi', icon: BarChart3 },
  { label: 'Pengaturan', href: '/dashboard/admin/pengaturan', icon: Settings },
  { label: 'Profil Saya', href: '/dashboard/admin/profil', icon: UserCircle },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        className="md:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#002147] text-amber-300 shadow-md hover:bg-[#0a3370] transition"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          flex flex-col w-64 shrink-0 bg-[#002147]
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:min-h-screen md:transition-none
        `}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="md:hidden absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-7 py-6 border-b border-white/10">
          <Link href="/dashboard/admin" className="block" onClick={() => setOpen(false)}>
            <span className="font-heading text-xl font-bold text-amber-400 leading-none">
              SupervisiEdu
            </span>
            <p className="font-body text-[11px] text-white/35 mt-1 tracking-wide">
              Panel Administrator
            </p>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="font-body text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-3">
            Menu Utama
          </p>
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm transition-all ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-300 font-semibold'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/40'}`}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-5 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg font-body text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
