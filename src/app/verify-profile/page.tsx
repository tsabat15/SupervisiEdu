'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import type { UserRole, Profile } from '@/src/types/database'

const ROLE_LABEL: Record<UserRole, string> = {
  guru: 'Guru',
  kepsek: 'Kepala Sekolah',
  admin: 'Administrator',
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'kepsek', label: 'Kepala Sekolah' },
  { value: 'guru', label: 'Guru' },
]

export default function VerifyProfilePage() {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current

  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userNip, setUserNip] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('kepsek')
  const [hasExistingProfile, setHasExistingProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      const email = user.email ?? ''
      const nip = email.replace('@sistem.lokal', '')

      setUserId(user.id)
      setUserEmail(email)
      setUserNip(nip)

      // maybeSingle() returns null (not an error) when no row is found
      const { data: profile } = (await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()) as unknown as { data: Profile | null; error: unknown }

      if (profile) {
        setFullName(profile.full_name)
        setRole(profile.role)
        setHasExistingProfile(true)
      }
      // No profile → form stays at defaults; user fills in name and picks role

      setPageLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) return

    setError(null)
    setSubmitting(true)

    // 1. Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (passwordError) {
      setError(`Gagal mengganti kata sandi: ${passwordError.message}`)
      setSubmitting(false)
      return
    }

    // 2. Upsert profile — inserts on first login, updates on subsequent visits
    const { error: profileError } = await (supabase.from('profiles') as any).upsert(
      {
        id: userId,
        full_name: fullName.trim(),
        email: userEmail,
        nip: userNip || null,
        role,
        is_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    ) as { error: { message: string } | null }

    if (profileError) {
      setError(`Gagal menyimpan profil: ${profileError.message}`)
      setSubmitting(false)
      return
    }

    // 3. Flush server cache then let /dashboard route to the correct panel
    router.refresh()
    router.push('/dashboard')
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 lg:p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200 mb-4">
            {hasExistingProfile
              ? <ShieldCheck className="w-7 h-7 text-amber-500" />
              : <UserPlus className="w-7 h-7 text-amber-500" />}
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 mb-1">
            {hasExistingProfile ? 'Verifikasi Profil & Keamanan' : 'Buat Profil Akun'}
          </h1>
          <p className="font-body text-sm text-slate-500">
            {hasExistingProfile
              ? 'Lengkapi data Anda untuk melanjutkan ke dashboard'
              : 'Akun Anda belum memiliki profil. Lengkapi data di bawah ini.'}
          </p>

          {hasExistingProfile && (
            <span className="inline-block mt-3 font-body text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Peran: {ROLE_LABEL[role]}
            </span>
          )}
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-amber-700 leading-relaxed">
            Sebagai langkah keamanan wajib, silakan ganti kata sandi default Anda
            sebelum mengakses dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="block font-body text-sm font-medium text-slate-700 mb-1.5"
            >
              Nama Lengkap
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Role selector — only for accounts with no existing profile row */}
          {!hasExistingProfile && (
            <div>
              <label
                htmlFor="role"
                className="block font-body text-sm font-medium text-slate-700 mb-1.5"
              >
                Peran
              </label>
              <select
                id="role"
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
          )}

          {/* New password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block font-body text-sm font-medium text-slate-700 mb-1.5"
            >
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 pr-11 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= level * 3
                          ? level <= 1
                            ? 'bg-red-400'
                            : level <= 2
                            ? 'bg-amber-400'
                            : level <= 3
                            ? 'bg-yellow-400'
                            : 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="font-body text-xs text-slate-400">
                  {newPassword.length < 4
                    ? 'Terlalu pendek'
                    : newPassword.length < 7
                    ? 'Lemah'
                    : newPassword.length < 10
                    ? 'Cukup kuat'
                    : 'Kuat'}
                  {newPassword.length < 8 && (
                    <span className="text-red-400"> — minimal 8 karakter</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="font-body text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !fullName.trim() || newPassword.length < 8}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-body font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Memproses...' : 'Simpan & Lanjutkan'}
          </button>

        </form>

        <p className="font-body text-xs text-slate-400 text-center mt-6 leading-relaxed">
          Data ini hanya digunakan untuk keamanan akun Anda dan tidak dibagikan kepada pihak lain.
        </p>

      </div>
    </div>
  )
}