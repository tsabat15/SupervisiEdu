'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const email = `${nip.trim()}@sistem.lokal`
    const supabase = createBrowserClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('NIP atau kata sandi salah. Silakan periksa kembali dan coba lagi.')
      setLoading(false)
      return
    }

    router.push('/verify-profile')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Kiri: gambar + overlay navy ─────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col">
        <img
          src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80"
          alt="Supervisi Pendidikan"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Navy overlay */}
        <div className="absolute inset-0 bg-slate-900/75" />

        {/* Konten di atas overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <Link href="/" className="font-heading text-xl font-bold text-amber-400 w-fit">
            SupervisiEdu
          </Link>

          <div className="max-w-sm">
            <h1 className="font-heading text-3xl xl:text-4xl font-bold text-white leading-snug mb-4">
              Sistem Supervisi<br />Pendidikan Terpadu
            </h1>
            <p className="font-body text-slate-300 text-base leading-relaxed">
              Platform digital untuk memantau, mengevaluasi, dan meningkatkan
              kualitas proses belajar mengajar secara terstruktur dan berbasis data.
            </p>
          </div>

          <p className="font-body text-sm text-slate-500">© 2026 SupervisiEdu</p>
        </div>
      </div>

      {/* ── Kanan: form putih ────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-white px-8 py-12 min-h-screen">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <Link
            href="/"
            className="lg:hidden block font-heading text-xl font-bold text-slate-900 text-center mb-8"
          >
            SupervisiEdu
          </Link>

          {/* Heading form */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-1">
              Masuk ke Sistem
            </h2>
            <p className="font-body text-sm text-slate-500">
              Masuk menggunakan NIP dan kata sandi Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* NIP */}
            <div>
              <label
                htmlFor="nip"
                className="block font-body text-sm font-medium text-slate-700 mb-1.5"
              >
                NIP / Nomor Unik
              </label>
              <input
                id="nip"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="Contoh: 198001012005011001"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                suppressHydrationWarning
                className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              />
              <p className="font-body text-xs text-slate-400 mt-1.5">
                Akan digabungkan menjadi{' '}
                <span className="text-slate-500 font-medium">
                  {nip ? `${nip}@sistem.lokal` : 'NIP@sistem.lokal'}
                </span>
              </p>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block font-body text-sm font-medium text-slate-700 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suppressHydrationWarning
                  className="w-full font-body text-sm text-slate-900 placeholder-slate-400 px-4 py-3 pr-11 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  suppressHydrationWarning
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              disabled={loading || !nip.trim() || !password}
              suppressHydrationWarning
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-body font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>

          </form>

          <p className="font-body text-xs text-slate-400 text-center mt-8 leading-relaxed">
            Mengalami kendala akses?{' '}
            <span className="text-slate-500">Hubungi administrator sistem Anda.</span>
          </p>

        </div>
      </div>

    </div>
  )
}
