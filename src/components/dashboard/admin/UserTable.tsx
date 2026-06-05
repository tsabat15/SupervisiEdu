'use client'

import { useState } from 'react'
import { Trash2, Users } from 'lucide-react'
import type { Profile, UserRole } from '@/src/types/database'
import { deleteUser } from '@/src/app/dashboard/admin/pengguna/actions'

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: 'Administrator',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  guru: {
    label: 'Guru',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  kepsek: {
    label: 'Kepala Sekolah',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

interface Props {
  users: Profile[]
  onToast: (type: 'success' | 'error', message: string) => void
}

export default function UserTable({ users, onToast }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(user: Profile) {
    if (!confirm(`Hapus pengguna ${user.full_name}? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeletingId(user.id)
    const result = await deleteUser(user.id)
    setDeletingId(null)
    if (result.error) {
      onToast('error', `Gagal menghapus: ${result.error}`)
    } else {
      onToast('success', `${user.full_name} berhasil dihapus.`)
    }
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-md p-12 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="font-body text-sm text-slate-400">Belum ada pengguna terdaftar.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-md overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-[#002147]">
            <th className="font-body font-semibold text-white/80 text-left px-6 py-4">Pengguna</th>
            <th className="font-body font-semibold text-white/80 text-left px-6 py-4">NIP</th>
            <th className="font-body font-semibold text-white/80 text-left px-6 py-4">Peran</th>
            <th className="font-body font-semibold text-white/80 text-left px-6 py-4">Terdaftar</th>
            <th className="px-6 py-4 w-16" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => {
            const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.guru
            return (
              <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="font-body text-xs font-bold text-amber-700">
                        {getInitials(user.full_name)}
                      </span>
                    </div>
                    <span className="font-body font-medium text-slate-800">{user.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-body text-slate-500 font-mono text-xs">
                  {user.nip ?? '—'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block font-body text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="px-6 py-4 font-body text-slate-400 text-xs">
                  {new Date(user.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(user)}
                    disabled={deletingId === user.id}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors disabled:opacity-40"
                    aria-label="Hapus pengguna"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}