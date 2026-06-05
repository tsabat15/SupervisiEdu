'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eraser, Loader2, Save, Trash2 } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { createBrowserClient } from '@/src/utils/supabase/client'
import { updateSignatureUrl } from '@/src/app/dashboard/profil/actions'

const BUCKET = 'signatures'

interface Props {
  userId: string
  initialSignatureUrl: string | null
}

export default function SignatureUploader({ userId, initialSignatureUrl }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const padRef = useRef<SignatureCanvas | null>(null)

  const [signatureUrl, setSignatureUrl] = useState(initialSignatureUrl)
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function notify(msg: string, isError = false) {
    if (isError) {
      setError(msg)
      setSuccess(null)
    } else {
      setSuccess(msg)
      setError(null)
    }
  }

  function handleClear() {
    padRef.current?.clear()
    setError(null)
    setSuccess(null)
  }

  async function handleSave() {
    setError(null)
    setSuccess(null)

    const pad = padRef.current
    if (!pad || pad.isEmpty()) {
      notify('Kanvas masih kosong. Goreskan tanda tangan dulu.', true)
      return
    }

    const canvas = pad.getCanvas()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    )

    if (!blob) {
      notify('Gagal mengubah kanvas menjadi gambar.', true)
      return
    }

    setBusy(true)
    try {
      const path = `${userId}/signature.png`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/png' })

      if (uploadError) {
        notify(`Gagal mengunggah: ${uploadError.message}`, true)
        return
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`

      startTransition(async () => {
        const result = await updateSignatureUrl(finalUrl)
        if (result.error) {
          notify(`Gagal menyimpan URL: ${result.error}`, true)
          return
        }
        setSignatureUrl(finalUrl)
        pad.clear()
        notify('Tanda tangan tersimpan.')
        router.refresh()
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveSaved() {
    if (!signatureUrl) return
    if (!confirm('Hapus tanda tangan yang tersimpan?')) return

    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const { data: files } = await supabase.storage.from(BUCKET).list(userId)
      if (files && files.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(files.map((f) => `${userId}/${f.name}`))
      }

      startTransition(async () => {
        const result = await updateSignatureUrl(null)
        if (result.error) {
          notify(`Gagal menghapus: ${result.error}`, true)
          return
        }
        setSignatureUrl(null)
        notify('Tanda tangan dihapus.')
        router.refresh()
      })
    } finally {
      setBusy(false)
    }
  }

  const working = busy || isPending

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 md:px-6 py-4 border-b border-slate-100">
        <h2 className="font-heading text-base font-bold text-[#002147]">Tanda Tangan Digital</h2>
        <p className="font-body text-xs text-slate-500 mt-0.5">
          Gambar tanda tangan langsung di kanvas. Hasilnya disimpan sebagai PNG.
        </p>
      </div>

      <div className="px-5 md:px-6 py-5 space-y-5">
        {signatureUrl && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-emerald-800">
                  Tanda tangan aktif
                </p>
                <p className="font-body text-xs text-emerald-700/80 mt-0.5">
                  Tanda tangan di bawah ini sudah tersimpan dan siap digunakan.
                </p>
                <div className="mt-3 rounded-md bg-white border border-emerald-200 px-3 py-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureUrl}
                    alt="Tanda tangan tersimpan"
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSaved}
                disabled={working}
                aria-label="Hapus tanda tangan tersimpan"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-body text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="font-body text-sm font-semibold text-slate-700 mb-2">
            {signatureUrl ? 'Buat tanda tangan baru' : 'Buat tanda tangan'}
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="inline-block rounded-lg border border-slate-300 bg-white shadow-inner overflow-hidden">
              <SignatureCanvas
                ref={padRef}
                penColor="#0F172A"
                backgroundColor="#FFFFFF"
                canvasProps={{
                  width: 400,
                  height: 200,
                  className: 'block touch-none',
                  'aria-label': 'Kanvas tanda tangan',
                }}
              />
            </div>
          </div>
          <p className="font-body text-xs text-slate-400 mt-2">
            Goreskan tanda tangan dengan mouse atau jari (di perangkat sentuh).
          </p>
        </div>

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

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={working}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <Eraser className="w-4 h-4" />
            Hapus
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={working}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold text-[#002147] bg-gradient-to-r from-[#FFC600] to-[#F7A800] hover:brightness-105 shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  )
}
