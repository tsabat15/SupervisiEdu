'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { updateProfile, updateLoginCredentials } from '@/src/app/dashboard/profil/actions'
import { createBrowserClient } from '@/src/utils/supabase/client'

interface Props {
  initialName: string
  initialNip: string | null
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition'

const labelClass = 'block font-body text-sm font-semibold text-slate-700 mb-1.5'

export default function ProfileEditForm({ initialName, initialNip }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current

  const [name, setName] = useState(initialName)
  const [nip, setNip] = useState(initialNip ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const credentialsChanging = nip.trim() !== (initialNip ?? '').trim() || newPassword.trim() !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (credentialsChanging) {
      if (!currentPassword) {
        setError('Masukkan kata sandi saat ini untuk mengubah NIP login atau kata sandi.')
        return
      }
      if (newPassword && newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok.')
        return
      }
    }

    startTransition(async () => {
      if (!credentialsChanging) {
        const result = await updateProfile({ full_name: name.trim(), nip: nip.trim() || null })
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess(true)
        }
        return
      }

      const result = await updateLoginCredentials({
        full_name: name.trim(),
        nip: nip.trim(),
        current_password: currentPassword,
        new_password: newPassword || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.requiresRelogin) {
        setRedirecting(true)
        await supabase.auth.signOut()
        router.push('/login')
      }
    })
  }

  if (redirecting) {
    return (
      <div className="px-5 md:px-6 py-8 flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        <p className="font-body text-sm text-slate-600">
          NIP &amp; kata sandi berhasil diperbarui. Mengarahkan ke halaman login...
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 md:px-6 py-5 space-y-5">
      <div>
        <label htmlFor="edit-name" className={labelClass}>
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
        <label htmlFor="edit-nip" className={labelClass}>
          NIP Login
        </label>
        <input
          id="edit-nip"
          type="text"
          inputMode="numeric"
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          disabled={isPending}
          required
          placeholder="Nomor Induk Pegawai"
          className={inputClass}
        />
        <p className="mt-1.5 font-body text-xs text-slate-400">
          NIP ini juga menjadi username login Anda. Mengubahnya memerlukan verifikasi kata
          sandi saat ini.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-4 space-y-4">
        <p className="font-body text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Ubah Kata Sandi Login (opsional)
        </p>
        <div>
          <label htmlFor="current-password" className={labelClass}>
            Kata Sandi Saat Ini
            {credentialsChanging && <span className="text-red-500"> *</span>}
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isPending}
            autoComplete="current-password"
            placeholder="Wajib diisi jika mengubah NIP atau kata sandi"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="new-password" className={labelClass}>
            Kata Sandi Baru
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isPending}
            autoComplete="new-password"
            minLength={8}
            placeholder="Kosongkan jika tidak ingin mengganti kata sandi"
            className={inputClass}
          />
        </div>
        {newPassword && (
          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPending}
              autoComplete="new-password"
              minLength={8}
              placeholder="Ulangi kata sandi baru"
              className={inputClass}
            />
          </div>
        )}
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
          disabled={isPending || !name.trim() || !nip.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </button>
      </div>
    </form>
  )
}
