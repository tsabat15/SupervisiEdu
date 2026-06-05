'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2, Save, Trash2, Upload } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import {
  updateSchoolSettings,
  type SchoolSettingsPayload,
} from '@/src/app/dashboard/admin/pengaturan/actions'
import type { SchoolSettings } from '@/src/types/database'

const BUCKET = 'school-assets'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

interface Props {
  initial: SchoolSettings
}

export default function SchoolSettingsForm({ initial }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<SchoolSettingsPayload>({
    school_name: initial.school_name,
    header_line_1: initial.header_line_1,
    header_line_2: initial.header_line_2,
    address: initial.address,
    phone: initial.phone,
    email: initial.email,
    website: initial.website,
    logo_url: initial.logo_url,
  })

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function patch<K extends keyof SchoolSettingsPayload>(
    key: K,
    value: SchoolSettingsPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function notify(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setSuccess(null)
    } else {
      setSuccess(msg)
      setError(null)
    }
  }

  async function handleLogoFile(file: File) {
    setError(null)
    setSuccess(null)

    if (!ALLOWED.includes(file.type)) {
      notify('Format tidak didukung. Gunakan PNG, JPG, WebP, atau SVG.', true)
      return
    }
    if (file.size > MAX_BYTES) {
      notify('Ukuran berkas maksimal 2 MB.', true)
      return
    }

    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `logo/school.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

      if (uploadError) {
        notify(`Gagal mengunggah logo: ${uploadError.message}`, true)
        return
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`

      patch('logo_url', finalUrl)
      notify('Logo terunggah. Klik "Simpan Pengaturan" untuk menyimpan.')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    if (!form.logo_url) return
    if (!confirm('Hapus logo sekolah?')) return

    setError(null)
    setSuccess(null)
    setUploadingLogo(true)
    try {
      const { data: files } = await supabase.storage.from(BUCKET).list('logo')
      if (files && files.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(files.map((f) => `logo/${f.name}`))
      }
      patch('logo_url', null)
      notify('Logo dihapus. Klik "Simpan Pengaturan" untuk konfirmasi.')
    } finally {
      setUploadingLogo(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await updateSchoolSettings(form)
      if (result.error) {
        notify(result.error, true)
        return
      }
      notify('Pengaturan tersimpan.')
      router.refresh()
    })
  }

  const busy = uploadingLogo || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100">
          <h2 className="font-heading text-base font-bold text-[#002147]">Logo Sekolah</h2>
          <p className="font-body text-xs text-slate-500 mt-0.5">
            Logo digunakan di kop laporan dan dokumen resmi.
          </p>
        </div>

        <div className="px-5 md:px-6 py-5 space-y-4">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 flex items-center justify-center min-h-[160px]">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_url}
                alt="Logo sekolah"
                className="max-h-32 w-auto object-contain"
              />
            ) : (
              <div className="text-center">
                <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-body text-sm text-slate-500">Belum ada logo</p>
                <p className="font-body text-xs text-slate-400 mt-0.5">
                  PNG, JPG, WebP, SVG &middot; maks 2 MB
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            aria-label="Pilih berkas logo"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoFile(file)
            }}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] border border-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 transition"
            >
              {uploadingLogo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {form.logo_url ? 'Ganti Logo' : 'Unggah Logo'}
            </button>
            {form.logo_url && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Logo
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 md:px-6 py-4 border-b border-slate-100">
          <h2 className="font-heading text-base font-bold text-[#002147]">Identitas Sekolah</h2>
          <p className="font-body text-xs text-slate-500 mt-0.5">
            Data ini akan tampil di kop dokumen dan laporan.
          </p>
        </div>

        <div className="px-5 md:px-6 py-5 space-y-4">
          <Field
            id="school_name"
            label="Nama Sekolah"
            value={form.school_name}
            onChange={(v) => patch('school_name', v)}
            placeholder="Contoh: SMA Negeri 1 Medan"
            disabled={busy}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="header_line_1"
              label="Header Baris 1"
              value={form.header_line_1}
              onChange={(v) => patch('header_line_1', v)}
              placeholder="Pemerintah Kota Medan"
              disabled={busy}
            />
            <Field
              id="header_line_2"
              label="Header Baris 2"
              value={form.header_line_2}
              onChange={(v) => patch('header_line_2', v)}
              placeholder="Dinas Pendidikan"
              disabled={busy}
            />
          </div>
          <Field
            id="address"
            label="Alamat"
            value={form.address}
            onChange={(v) => patch('address', v)}
            placeholder="Jl. Contoh No. 1, Medan"
            disabled={busy}
            textarea
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="phone"
              label="Telepon"
              value={form.phone}
              onChange={(v) => patch('phone', v)}
              placeholder="(061) 1234567"
              disabled={busy}
              type="tel"
            />
            <Field
              id="email"
              label="Email"
              value={form.email}
              onChange={(v) => patch('email', v)}
              placeholder="info@sekolah.sch.id"
              disabled={busy}
              type="email"
            />
          </div>
          <Field
            id="website"
            label="Website"
            value={form.website}
            onChange={(v) => patch('website', v)}
            placeholder="https://sekolah.sch.id"
            disabled={busy}
            type="url"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}
      {success && !error && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
          <p className="font-body text-xs text-emerald-700">{success}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-100 disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Pengaturan
        </button>
      </div>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url'
  textarea?: boolean
  disabled?: boolean
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea = false,
  disabled = false,
}: FieldProps) {
  const className =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:ring-2 focus:ring-[#002147]/20 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition'

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-body text-sm font-semibold text-slate-700 mb-1.5"
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className={`${className} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      )}
    </div>
  )
}
