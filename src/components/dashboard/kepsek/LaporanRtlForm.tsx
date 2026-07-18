'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { updateLaporanRtl } from '@/src/app/dashboard/kepsek/laporan/actions'
import type { RtlItem } from '@/src/types/database'

interface Props {
  reportId: string
  initialItems: RtlItem[] | null
  /** Teks rekomendasi lama (pra-RTL terstruktur) — dipakai sebagai prefill. */
  legacyRecommendation?: string | null
  readOnly?: boolean
}

const CODE = 'SPVC-07/08'
const TITLE = 'Rencana Tindak Lanjut (RTL)'
const SUBTITLE =
  'Identifikasi temuan masalah (SPVC-07) dan rencana aksi/coaching (SPVC-08).'

function normalize(items: RtlItem[] | null, legacy?: string | null): RtlItem[] {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((it) => ({
      masalah: it.masalah ?? '',
      aksi: it.aksi ?? '',
      target: it.target ?? '',
    }))
  }
  const text = (legacy ?? '').trim()
  if (text) return [{ masalah: '', aksi: text, target: '' }]
  return []
}

export default function LaporanRtlForm({
  reportId,
  initialItems,
  legacyRecommendation,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const seeded = useMemo(
    () => normalize(initialItems, legacyRecommendation),
    [initialItems, legacyRecommendation],
  )
  const [items, setItems] = useState<RtlItem[]>(seeded)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const filled = items.some((it) => it.masalah || it.aksi || it.target)

  function addItem() {
    setItems((prev) => [...prev, { masalah: '', aksi: '', target: '' }])
    setSaved(false)
  }
  function updateItem(index: number, field: keyof RtlItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
    setSaved(false)
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateLaporanRtl(reportId, items)
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  // ── Read-only (guru) ─────────────────────────────────────────────────────────
  if (readOnly) {
    if (seeded.length === 0) return null
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
        <CardHeader />
        <ol className="space-y-3 mt-4">
          {seeded.map((item, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="inline-flex items-center gap-2 font-body text-xs font-semibold text-[#002147] mb-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#002147] text-white text-[11px]">
                  {i + 1}
                </span>
                Tindak Lanjut #{i + 1}
              </p>
              {item.masalah && (
                <ReadField label="Temuan Masalah" value={item.masalah} />
              )}
              {item.aksi && <ReadField label="Rencana Aksi / Coaching" value={item.aksi} />}
              {item.target && <ReadField label="Target Waktu" value={item.target} />}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  // ── Editable (kepsek) ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <CardHeader />
        {filled && (
          <span className="inline-flex items-center gap-1 shrink-0 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" />
            Terisi
          </span>
        )}
      </div>

      <p className="font-body text-xs text-slate-500 mt-3">
        Rumuskan tindak lanjut untuk tiap temuan. Fokuskan pada aspek terlemah dari hasil observasi.
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center mt-3">
          <p className="font-body text-sm text-slate-400">Belum ada rencana tindak lanjut.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-body text-xs font-semibold text-[#002147]">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#002147] text-white text-[11px]">
                    {i + 1}
                  </span>
                  Tindak Lanjut #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 font-body text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>

              <div>
                <label htmlFor={`rtl-${i}-masalah`} className={labelCls}>
                  Temuan Masalah (SPVC-07)
                </label>
                <textarea
                  id={`rtl-${i}-masalah`}
                  value={item.masalah}
                  onChange={(e) => updateItem(i, 'masalah', e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Contoh: Guru kurang memfasilitasi kegiatan refleksi siswa di akhir pembelajaran."
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div>
                <label htmlFor={`rtl-${i}-aksi`} className={labelCls}>
                  Rencana Aksi / Coaching (SPVC-08)
                </label>
                <textarea
                  id={`rtl-${i}-aksi`}
                  value={item.aksi}
                  onChange={(e) => updateItem(i, 'aksi', e.target.value)}
                  disabled={isPending}
                  rows={2}
                  placeholder="Contoh: Pendampingan penyusunan instrumen refleksi + observasi ulang."
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div>
                <label htmlFor={`rtl-${i}-target`} className={labelCls}>
                  Target Waktu
                </label>
                <input
                  id={`rtl-${i}-target`}
                  type="text"
                  value={item.target}
                  onChange={(e) => updateItem(i, 'target', e.target.value)}
                  disabled={isPending}
                  placeholder="Contoh: 2 minggu / akhir bulan Agustus"
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addItem}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-body text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition mt-3"
      >
        <Plus className="w-4 h-4" />
        Tambah Tindak Lanjut
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mt-3">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#002147]/20 bg-white text-[#002147] font-body text-sm font-semibold hover:bg-[#002147]/5 disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan {CODE}
        </button>
        {saved && !isPending && (
          <span className="font-body text-xs text-emerald-600">Tersimpan.</span>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:bg-slate-50 transition'
const labelCls =
  'block font-body text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'

function CardHeader() {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#002147] text-white tracking-wide">
          {CODE}
        </span>
        <h2 className="font-heading text-sm font-bold text-[#002147] truncate">{TITLE}</h2>
      </div>
      <p className="font-body text-xs text-slate-500 mt-1">{SUBTITLE}</p>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="font-body text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="font-body text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {value}
      </p>
    </div>
  )
}
