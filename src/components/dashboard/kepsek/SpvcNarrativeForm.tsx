'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Save } from 'lucide-react'
import { updateSpvcForm } from '@/src/app/dashboard/kepsek/laporan/actions'
import { hasSpvcContent, type SpvcFormDef } from '@/src/lib/spvc-forms'
import type { SpvcData } from '@/src/types/database'

interface Props {
  reportId: string
  def: SpvcFormDef
  initialData: SpvcData | null
  readOnly?: boolean
}

export default function SpvcNarrativeForm({ reportId, def, initialData, readOnly = false }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<SpvcData>(initialData ?? {})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const filled = hasSpvcContent(values)

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateSpvcForm(reportId, def.column, values)
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
    if (!hasSpvcContent(initialData)) return null
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
        <FormHeader def={def} />
        <div className="space-y-4 mt-4">
          {def.fields.map((field) => {
            const text = (initialData?.[field.key] ?? '').trim()
            if (!text) return null
            return (
              <div key={field.key}>
                <p className="font-body text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {field.label}
                </p>
                <p className="font-body text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {text}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Editable (kepsek) ────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <FormHeader def={def} />
        {filled && (
          <span className="inline-flex items-center gap-1 shrink-0 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" />
            Terisi
          </span>
        )}
      </div>

      <div className="space-y-4 mt-4">
        {def.fields.map((field) => {
          const id = `${def.column}-${field.key}`
          return (
            <div key={field.key}>
              <label
                htmlFor={id}
                className="block font-body text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1"
              >
                {field.label}
              </label>
              <textarea
                id={id}
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                disabled={isPending}
                rows={3}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:bg-slate-50 transition resize-y leading-relaxed"
              />
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mt-3">
          <p className="font-body text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#002147]/20 bg-white text-[#002147] font-body text-sm font-semibold hover:bg-[#002147]/5 disabled:opacity-50 transition"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan {def.code}
        </button>
        {saved && !isPending && (
          <span className="font-body text-xs text-emerald-600">Tersimpan.</span>
        )}
      </div>
    </div>
  )
}

function FormHeader({ def }: { def: SpvcFormDef }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-body text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#002147] text-white tracking-wide">
          {def.code}
        </span>
        <h2 className="font-heading text-sm font-bold text-[#002147] truncate">{def.title}</h2>
      </div>
      <p className="font-body text-xs text-slate-500 mt-1">{def.subtitle}</p>
    </div>
  )
}
