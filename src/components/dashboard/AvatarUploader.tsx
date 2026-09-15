'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import { updateAvatarUrl } from '@/src/app/dashboard/profil/actions'
import Avatar from '@/src/components/dashboard/Avatar'

const BUCKET = 'avatars'
const MAX_FILE_MB = 5

interface Props {
  userId: string
  fullName: string
  initialAvatarUrl: string | null
}

export default function AvatarUploader({ userId, fullName, initialAvatarUrl }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.')
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file melebihi batas ${MAX_FILE_MB} MB.`)
      return
    }

    setBusy(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

      if (upErr) {
        setError(`Gagal mengunggah: ${upErr.message}`)
        return
      }

      // Clean up any stale file left from a previous upload with a different
      // extension, now that the new upload has succeeded — never delete the
      // old file before the new one is confirmed, or a failed upload would
      // destroy the user's existing photo instead of leaving it intact.
      const { data: files } = await supabase.storage.from(BUCKET).list(userId)
      const stalePaths = (files ?? [])
        .map((f) => `${userId}/${f.name}`)
        .filter((p) => p !== path)
      if (stalePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(stalePaths)
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`

      startTransition(async () => {
        const result = await updateAvatarUrl(finalUrl)
        if (result.error) {
          setError(`Gagal menyimpan foto: ${result.error}`)
          return
        }
        setAvatarUrl(finalUrl)
        window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatarUrl: finalUrl } }))
        router.refresh()
      })
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    if (!confirm('Hapus foto profil?')) return
    startTransition(async () => {
      const { data: files } = await supabase.storage.from(BUCKET).list(userId)
      if (files && files.length > 0) {
        await supabase.storage
          .from(BUCKET)
          .remove(files.map((f) => `${userId}/${f.name}`))
      }

      const result = await updateAvatarUrl(null)
      if (result.error) {
        setError(`Gagal menghapus: ${result.error}`)
        return
      }
      setAvatarUrl(null)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatarUrl: null } }))
      router.refresh()
    })
  }

  const working = busy || isPending

  return (
    <div className="flex items-center gap-4">
      <Avatar name={fullName} avatarUrl={avatarUrl} size="lg" />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={working}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#002147]/20 bg-white text-[#002147] font-body text-xs font-semibold hover:bg-[#002147]/5 disabled:opacity-50 transition"
          >
            {working ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {avatarUrl ? 'Ganti Foto' : 'Unggah Foto'}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={working}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          )}
        </div>
        {error && <p className="font-body text-xs text-red-600">{error}</p>}
        <p className="font-body text-[11px] text-slate-400">JPG/PNG, maks. {MAX_FILE_MB} MB.</p>
      </div>
    </div>
  )
}
