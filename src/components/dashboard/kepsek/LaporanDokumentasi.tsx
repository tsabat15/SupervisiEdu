'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageIcon, Loader2, Upload, Video, X } from 'lucide-react'
import { createBrowserClient } from '@/src/utils/supabase/client'
import { updateLaporanDokumentasi } from '@/src/app/dashboard/kepsek/laporan/actions'
import type { DocItem } from '@/src/types/database'

const BUCKET = 'supervisi-dokumentasi'
const MAX_FILE_MB = 50
const MAX_DOCS = 12

interface Props {
  reportId: string
  initialDocs: DocItem[] | null
  readOnly?: boolean
}

function detectType(mime: string): DocItem['type'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

function pathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length).split('?')[0]
}

export default function LaporanDokumentasi({ reportId, initialDocs, readOnly = false }: Props) {
  const router = useRouter()
  const supabase = useRef(createBrowserClient()).current
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [docs, setDocs] = useState<DocItem[]>(initialDocs ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function persist(next: DocItem[]) {
    startTransition(async () => {
      const result = await updateLaporanDokumentasi(reportId, next)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    if (docs.length + files.length > MAX_DOCS) {
      setError(`Maksimal ${MAX_DOCS} berkas dokumentasi per laporan.`)
      return
    }

    setBusy(true)
    try {
      const uploaded: DocItem[] = []
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`"${file.name}" melebihi batas ${MAX_FILE_MB} MB dan dilewati.`)
          continue
        }
        const path = `${reportId}/${Date.now()}-${safeName(file.name)}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, cacheControl: '3600', contentType: file.type })
        if (upErr) {
          setError(`Gagal mengunggah "${file.name}": ${upErr.message}`)
          continue
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        uploaded.push({ url: pub.publicUrl, name: file.name, type: detectType(file.type) })
      }

      if (uploaded.length > 0) {
        const next = [...docs, ...uploaded]
        setDocs(next)
        persist(next)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove(target: DocItem) {
    setError(null)
    setBusy(true)
    try {
      const path = pathFromUrl(target.url)
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]) // best-effort
      }
      const next = docs.filter((d) => d.url !== target.url)
      setDocs(next)
      persist(next)
    } finally {
      setBusy(false)
    }
  }

  // ── Read-only (guru) ─────────────────────────────────────────────────────────
  if (readOnly) {
    if (docs.length === 0) return null
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
        <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Dokumentasi Bukti</h2>
        <DocGrid docs={docs} />
      </div>
    )
  }

  // ── Editable (kepsek) ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-sm font-bold text-[#002147]">Dokumentasi Bukti</h2>
        <span className="font-body text-xs text-slate-400">
          {docs.length}/{MAX_DOCS}
        </span>
      </div>
      <p className="font-body text-xs text-slate-500 mb-4">
        Unggah foto atau video singkat sebagai bukti penguat hasil observasi (maks. {MAX_FILE_MB} MB
        per berkas).
      </p>

      {docs.length > 0 && <DocGrid docs={docs} onRemove={handleRemove} disabled={busy} />}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mt-3">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || docs.length >= MAX_DOCS}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#002147]/20 bg-white text-[#002147] font-body text-sm font-semibold hover:bg-[#002147]/5 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Unggah Dokumentasi
      </button>
    </div>
  )
}

function DocGrid({
  docs,
  onRemove,
  disabled,
}: {
  docs: DocItem[]
  onRemove?: (doc: DocItem) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {docs.map((doc) => (
        <div
          key={doc.url}
          className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
        >
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block">
            {doc.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.url}
                alt={doc.name}
                className="w-full h-24 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-slate-400">
                {doc.type === 'video' ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
                <span className="font-body text-[10px] px-2 text-center truncate max-w-full">
                  {doc.name}
                </span>
              </div>
            )}
          </a>

          {doc.type === 'image' && (
            <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 text-white">
              <ImageIcon className="w-3 h-3" />
            </div>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(doc)}
              disabled={disabled}
              aria-label={`Hapus ${doc.name}`}
              className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50 transition opacity-0 group-hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
