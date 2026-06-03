'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save } from 'lucide-react'
import { updateProfile } from '@/src/app/dashboard/profil/actions'

interface Props {
  initialName: string
  initialNip: string | null
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition'

export default function ProfileEditForm({ initialName, initialNip }: Props) {
  const [name, setName] = useState(initialName)
  const [nip, setNip] = useState(initialNip ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateProfile({ full_name: name.trim(), nip: nip.trim() || null })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 md:px-6 py-5 space-y-4">
      <div>
        <label
          htmlFor="edit-name"
          className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
        >
          Nama Lengkap
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
          placeholder="Nama lengkap Anda"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="edit-nip"
          className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
        >
          NIP{' '}
          <span className="font-normal text-slate-400 text-xs">(opsional)</span>
        </label>
        <input
          id="edit-nip"
          type="text"
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          disabled={isPending}
          placeholder="Nomor Induk Pegawai"
          className={inputClass}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
          <p className="font-body text-xs text-emerald-700">Profil berhasil disimpan.</p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </form>
  )
}
