'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createUser } from '@/src/app/dashboard/admin/pengguna/actions'
import type { UserRole } from '@/src/types/database'

interface Props {
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'guru', label: 'Guru' },
  { value: 'kepsek', label: 'Kepala Sekolah' },
]

export default function AddUserModal({ onClose, onSuccess, onError }: Props) {
  const [fullName, setFullName] = useState('')
  const [nip, setNip] = useState('')
  const [role, setRole] = useState<UserRole>('guru')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const result = await createUser({ fullName, nip, role })
    setSubmitting(false)
    if (result.error) {
      onError(`Gagal menambahkan pengguna: ${result.error}`)
    } else {
      onSuccess(`${fullName} berhasil ditambahkan.`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl font-bold text-slate-900">Tambah Pengguna</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="modal-fullName"
              className="block font-body text-sm font-medium text-slate-700 mb-1.5"
            >
              Nama Lengkap
            </label>
            <input
              id="modal-fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Budi Santoso, S.Pd."
              className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="modal-nip"
              className="block font-body text-sm font-medium text-slate-700 mb-1.5"
            >
              NIP
            </label>
            <input
              id="modal-nip"
              type="text"
              inputMode="numeric"
              required
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 198001012005011001"
              className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
            {nip && (
              <p className="font-body text-xs text-slate-400 mt-1.5">
                Email:{' '}
                <span className="text-slate-600 font-medium">{nip}@sistem.lokal</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="modal-role"
              className="block font-body text-sm font-medium text-slate-700 mb-1.5"
            >
              Peran
            </label>
            <select
              id="modal-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full font-body text-sm text-slate-900 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg font-body text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !fullName.trim() || !nip.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Memproses...' : 'Tambahkan'}
            </button>
          </div>
        </form>

        <p className="font-body text-xs text-slate-400 text-center mt-5 leading-relaxed">
          Kata sandi default = NIP. Pengguna wajib menggantinya saat login pertama.
        </p>
      </div>
    </div>
  )
}