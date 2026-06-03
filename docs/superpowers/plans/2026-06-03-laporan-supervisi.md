# Laporan Supervisi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fitur Laporan Supervisi — kepsek bisa membuat laporan observasi guru (mandiri atau terhubung jadwal), dan guru bisa membaca laporan yang sudah dipublish.

**Architecture:** Server actions menangani CRUD + publish/unpublish laporan. Kepsek mendapat 3 halaman (list, buat, detail/edit) dengan client components untuk interaksi. Guru mendapat 2 halaman read-only server-rendered. Notifikasi dikirim otomatis ke guru saat laporan dipublish. Kedua sidebar sudah memiliki link laporan — tidak perlu modifikasi sidebar.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS, Lucide React, Eikra design system (Deep Navy #002147, Gold gradient #FFC600→#F7A800).

---

## Konteks Codebase

- Pola server component: auth check → role check → data fetch → render dengan sidebar + header + main
- Pola DB query: `as unknown as { data: Type | null }` untuk type cast Supabase
- `requireKepsek()` pattern ada di `src/app/dashboard/kepsek/jadwal/actions.ts` — ikuti persis
- `createAdminClient()` digunakan untuk insert notifikasi (bypass RLS)
- `revalidatePath()` dipanggil setelah mutasi untuk invalidate cache
- Status laporan yang dipakai: `'draft'` dan `'submitted'` saja (kolom `'approved'` di DB tidak dipakai)
- KepsekSidebar sudah punya "Analisis Laporan" → `/dashboard/kepsek/laporan`
- GururSidebar sudah punya "Laporan Saya" → `/dashboard/guru/laporan`

## File Structure

**Baru dibuat:**
- `src/app/dashboard/kepsek/laporan/actions.ts` — server actions: createLaporan, updateLaporan, publishLaporan, unpublishLaporan, deleteLaporan
- `src/components/dashboard/kepsek/KepsekLaporanClient.tsx` — tabel list laporan + filter tabs
- `src/components/dashboard/kepsek/LaporanForm.tsx` — form buat/edit laporan (client)
- `src/components/dashboard/kepsek/LaporanDetailActions.tsx` — tombol publish/unpublish/delete (client)
- `src/app/dashboard/kepsek/laporan/page.tsx` — list halaman kepsek (server)
- `src/app/dashboard/kepsek/laporan/buat/page.tsx` — form buat halaman kepsek (server)
- `src/app/dashboard/kepsek/laporan/[id]/page.tsx` — detail/edit halaman kepsek (server)
- `src/app/dashboard/guru/laporan/page.tsx` — list halaman guru (server, read-only)
- `src/app/dashboard/guru/laporan/[id]/page.tsx` — detail halaman guru (server, read-only)

---

## Task 1: Server Actions

**Files:**
- Create: `src/app/dashboard/kepsek/laporan/actions.ts`

- [ ] **Step 1: Buat file actions.ts dengan semua server actions**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { ReportStatus } from '@/src/types/database'

export interface LaporanPayload {
  teacher_id: string
  visit_date: string
  subject: string
  class_name: string
  strengths?: string | null
  improvements?: string | null
  recommendations?: string | null
  score?: number | null
  schedule_id?: string | null
}

async function requireKepsek(): Promise<{ userId?: string; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    return { error: 'Hanya kepala sekolah yang dapat mengelola laporan.' }
  }
  return { userId: user.id }
}

async function notifyGuru(args: {
  teacherId: string
  title: string
  message: string
  link: string
}) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: args.teacherId,
    title: args.title,
    message: args.message,
    link: args.link,
  } as never)
}

export async function createLaporan(
  payload: LaporanPayload,
): Promise<{ id?: string; error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!payload.teacher_id) return { error: 'Pilih guru terlebih dahulu.' }
  if (!payload.visit_date) return { error: 'Tanggal kunjungan wajib diisi.' }
  if (!payload.subject.trim()) return { error: 'Mata pelajaran wajib diisi.' }
  if (!payload.class_name.trim()) return { error: 'Kelas wajib diisi.' }
  if (payload.score !== null && payload.score !== undefined && (payload.score < 0 || payload.score > 100)) {
    return { error: 'Nilai harus antara 0 dan 100.' }
  }

  const supabase = await createServerClient()
  const row = {
    supervisor_id: userId,
    teacher_id: payload.teacher_id,
    visit_date: payload.visit_date,
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    strengths: payload.strengths?.trim() || null,
    improvements: payload.improvements?.trim() || null,
    recommendations: payload.recommendations?.trim() || null,
    score: payload.score ?? null,
    schedule_id: payload.schedule_id || null,
    status: 'draft' satisfies ReportStatus,
  }

  const { data, error } = (await supabase
    .from('supervision_reports')
    .insert(row as never)
    .select('id')
    .single()) as unknown as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Gagal membuat laporan.' }

  revalidatePath('/dashboard/kepsek/laporan')
  return { id: data.id }
}

export async function updateLaporan(
  payload: LaporanPayload & { id: string },
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!payload.teacher_id) return { error: 'Pilih guru terlebih dahulu.' }
  if (!payload.visit_date) return { error: 'Tanggal kunjungan wajib diisi.' }
  if (!payload.subject.trim()) return { error: 'Mata pelajaran wajib diisi.' }
  if (!payload.class_name.trim()) return { error: 'Kelas wajib diisi.' }
  if (payload.score !== null && payload.score !== undefined && (payload.score < 0 || payload.score > 100)) {
    return { error: 'Nilai harus antara 0 dan 100.' }
  }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id')
    .eq('id', payload.id)
    .single()) as unknown as { data: { supervisor_id: string } | null }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) return { error: 'Anda tidak memiliki akses ke laporan ini.' }

  const updates = {
    teacher_id: payload.teacher_id,
    visit_date: payload.visit_date,
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    strengths: payload.strengths?.trim() || null,
    improvements: payload.improvements?.trim() || null,
    recommendations: payload.recommendations?.trim() || null,
    score: payload.score ?? null,
    schedule_id: payload.schedule_id || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('supervision_reports')
    .update(updates as never)
    .eq('id', payload.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kepsek/laporan')
  revalidatePath(`/dashboard/kepsek/laporan/${payload.id}`)
  return {}
}

export async function publishLaporan(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id, teacher_id, subject, class_name')
    .eq('id', id)
    .single()) as unknown as {
    data: {
      supervisor_id: string
      teacher_id: string
      subject: string
      class_name: string
    } | null
  }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) return { error: 'Anda tidak memiliki akses ke laporan ini.' }

  const { error } = await supabase
    .from('supervision_reports')
    .update({
      status: 'submitted' satisfies ReportStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  if (error) return { error: error.message }

  await notifyGuru({
    teacherId: existing.teacher_id,
    title: 'Laporan Supervisi Tersedia',
    message: `Laporan supervisi Anda untuk ${existing.subject} ${existing.class_name} sudah tersedia.`,
    link: `/dashboard/guru/laporan/${id}`,
  })

  revalidatePath('/dashboard/kepsek/laporan')
  revalidatePath(`/dashboard/kepsek/laporan/${id}`)
  revalidatePath('/dashboard/guru/laporan')
  revalidatePath(`/dashboard/guru/laporan/${id}`)
  return {}
}

export async function unpublishLaporan(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id')
    .eq('id', id)
    .single()) as unknown as { data: { supervisor_id: string } | null }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) return { error: 'Anda tidak memiliki akses ke laporan ini.' }

  const { error } = await supabase
    .from('supervision_reports')
    .update({
      status: 'draft' satisfies ReportStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kepsek/laporan')
  revalidatePath(`/dashboard/kepsek/laporan/${id}`)
  revalidatePath('/dashboard/guru/laporan')
  revalidatePath(`/dashboard/guru/laporan/${id}`)
  return {}
}

export async function deleteLaporan(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id, status')
    .eq('id', id)
    .single()) as unknown as {
    data: { supervisor_id: string; status: ReportStatus } | null
  }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) return { error: 'Anda tidak memiliki akses ke laporan ini.' }
  if (existing.status !== 'draft') return { error: 'Hanya laporan draft yang dapat dihapus.' }

  const { error } = await supabase.from('supervision_reports').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/kepsek/laporan')
  return {}
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
cd "d:\My Project\supervisi-sekolah"
npx tsc --noEmit
```

Expected: 0 error baru (ada 2 pre-existing errors di pengguna/actions.ts dan verify-profile/page.tsx — itu normal).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/kepsek/laporan/actions.ts
git commit -m "feat: add laporan supervisi server actions"
```

---

## Task 2: KepsekLaporanClient Component

**Files:**
- Create: `src/components/dashboard/kepsek/KepsekLaporanClient.tsx`

- [ ] **Step 1: Buat KepsekLaporanClient.tsx**

```typescript
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus, FileText } from 'lucide-react'
import type { ReportStatus } from '@/src/types/database'

interface LaporanRow {
  id: string
  teacher_name: string | null
  subject: string
  class_name: string
  visit_date: string
  score: number | null
  status: ReportStatus
}

interface Props {
  initialReports: LaporanRow[]
}

type FilterValue = 'semua' | ReportStatus

const STATUS_BADGE: Record<ReportStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  approved: { label: 'Approved', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'semua', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Published' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="font-body text-xs text-slate-400">—</span>
  }
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : score >= 60
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-block font-body text-xs font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {score}
    </span>
  )
}

export default function KepsekLaporanClient({ initialReports }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValue>('semua')

  const filtered = useMemo(() => {
    if (filter === 'semua') return initialReports
    return initialReports.filter((r) => r.status === filter)
  }, [initialReports, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md font-body text-xs font-semibold transition ${
                filter === f.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push('/dashboard/kepsek/laporan/buat')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition shadow-sm"
        >
          <FilePlus className="w-4 h-4" />
          Buat Laporan
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="font-body text-sm text-slate-500">Belum ada laporan supervisi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[#002147]">
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Guru</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Mata Pelajaran</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Kelas</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Tanggal</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Nilai</th>
                <th className="font-body font-semibold text-white/80 text-left px-5 md:px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const badge = STATUS_BADGE[r.status]
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/dashboard/kepsek/laporan/${r.id}`)}
                    className="hover:bg-slate-50/60 transition cursor-pointer"
                  >
                    <td className="px-5 md:px-6 py-4 font-body font-medium text-slate-800">
                      {r.teacher_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{r.subject}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-700">{r.class_name}</td>
                    <td className="px-5 md:px-6 py-4 font-body text-slate-600">{formatDate(r.visit_date)}</td>
                    <td className="px-5 md:px-6 py-4">
                      <ScoreBadge score={r.score} />
                    </td>
                    <td className="px-5 md:px-6 py-4">
                      <span
                        className={`inline-block font-body text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kepsek/KepsekLaporanClient.tsx
git commit -m "feat: add KepsekLaporanClient table component"
```

---

## Task 3: LaporanForm Component

**Files:**
- Create: `src/components/dashboard/kepsek/LaporanForm.tsx`

- [ ] **Step 1: Buat LaporanForm.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  createLaporan,
  updateLaporan,
  type LaporanPayload,
} from '@/src/app/dashboard/kepsek/laporan/actions'
import type { SupervisionReport } from '@/src/types/database'

interface GuruOption {
  id: string
  full_name: string
}

interface JadwalOption {
  id: string
  label: string
}

interface Props {
  mode: 'create' | 'edit'
  initialData?: SupervisionReport
  guruOptions: GuruOption[]
  jadwalOptions: JadwalOption[]
}

export default function LaporanForm({ mode, initialData, guruOptions, jadwalOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [teacherId, setTeacherId] = useState(initialData?.teacher_id ?? '')
  const [visitDate, setVisitDate] = useState(
    initialData?.visit_date ?? new Date().toISOString().slice(0, 10),
  )
  const [subject, setSubject] = useState(initialData?.subject ?? '')
  const [className, setClassName] = useState(initialData?.class_name ?? '')
  const [strengths, setStrengths] = useState(initialData?.strengths ?? '')
  const [improvements, setImprovements] = useState(initialData?.improvements ?? '')
  const [recommendations, setRecommendations] = useState(initialData?.recommendations ?? '')
  const [scoreStr, setScoreStr] = useState(initialData?.score?.toString() ?? '')
  const [scheduleId, setScheduleId] = useState(initialData?.schedule_id ?? '')

  function buildPayload(): LaporanPayload {
    const parsedScore = scoreStr.trim() !== '' ? parseInt(scoreStr, 10) : null
    return {
      teacher_id: teacherId,
      visit_date: visitDate,
      subject,
      class_name: className,
      strengths: strengths.trim() || null,
      improvements: improvements.trim() || null,
      recommendations: recommendations.trim() || null,
      score: parsedScore,
      schedule_id: scheduleId || null,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createLaporan(buildPayload())
        if (result.error) {
          setError(result.error)
          return
        }
        router.push(`/dashboard/kepsek/laporan/${result.id}`)
      } else {
        const result = await updateLaporan({ ...buildPayload(), id: initialData!.id })
        if (result.error) {
          setError(result.error)
          return
        }
        setSuccess(true)
      }
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition'
  const labelCls = 'block font-body text-sm font-medium text-slate-700 mb-1'
  const textareaCls = inputCls + ' resize-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="font-body text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="font-body text-sm text-emerald-700">Laporan berhasil disimpan.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Guru <span className="text-red-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">-- Pilih Guru --</option>
            {guruOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Tanggal Kunjungan <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Matematika"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Kelas <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="Contoh: X-A"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Nilai (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreStr}
            onChange={(e) => setScoreStr(e.target.value)}
            placeholder="Opsional"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Hubungkan ke Jadwal (opsional)</label>
          <select
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className={inputCls}
          >
            <option value="">-- Tidak dihubungkan --</option>
            {jadwalOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Kekuatan yang Diamati</label>
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          rows={3}
          placeholder="Hal-hal positif yang ditemukan selama observasi..."
          className={textareaCls}
        />
      </div>

      <div>
        <label className={labelCls}>Area yang Perlu Ditingkatkan</label>
        <textarea
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          rows={3}
          placeholder="Aspek yang masih perlu diperbaiki..."
          className={textareaCls}
        />
      </div>

      <div>
        <label className={labelCls}>Rekomendasi</label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={3}
          placeholder="Saran tindak lanjut untuk guru..."
          className={textareaCls}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || !teacherId || !visitDate || !subject.trim() || !className.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Simpan Draft
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kepsek/LaporanForm.tsx
git commit -m "feat: add LaporanForm client component"
```

---

## Task 4: LaporanDetailActions Component

**Files:**
- Create: `src/components/dashboard/kepsek/LaporanDetailActions.tsx`

- [ ] **Step 1: Buat LaporanDetailActions.tsx**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Trash2, Undo2 } from 'lucide-react'
import {
  publishLaporan,
  unpublishLaporan,
  deleteLaporan,
} from '@/src/app/dashboard/kepsek/laporan/actions'
import type { ReportStatus } from '@/src/types/database'

interface Props {
  reportId: string
  status: ReportStatus
}

export default function LaporanDetailActions({ reportId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePublish() {
    setError(null)
    startTransition(async () => {
      const result = await publishLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleUnpublish() {
    setError(null)
    startTransition(async () => {
      const result = await unpublishLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirm('Hapus laporan ini secara permanen?')) return
    setError(null)
    startTransition(async () => {
      const result = await deleteLaporan(reportId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/dashboard/kepsek/laporan')
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-body text-sm text-red-600">{error}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {status === 'draft' && (
          <>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFC600] to-[#F7A800] text-slate-900 font-body text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish ke Guru
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-body text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Laporan
            </button>
          </>
        )}
        {status === 'submitted' && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-body text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            Batalkan Publish
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/kepsek/LaporanDetailActions.tsx
git commit -m "feat: add LaporanDetailActions client component"
```

---

## Task 5: Kepsek Laporan List Page

**Files:**
- Create: `src/app/dashboard/kepsek/laporan/page.tsx`

- [ ] **Step 1: Buat page.tsx untuk list laporan kepsek**

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import KepsekLaporanClient from '@/src/components/dashboard/kepsek/KepsekLaporanClient'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

interface LaporanRow {
  id: string
  teacher_name: string | null
  subject: string
  class_name: string
  visit_date: string
  score: number | null
  status: SupervisionReport['status']
}

export default async function KepsekLaporanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: rawReports } = (await supabase
    .from('supervision_reports')
    .select('id, teacher_id, subject, class_name, visit_date, score, status')
    .eq('supervisor_id', user.id)
    .order('visit_date', { ascending: false })) as unknown as {
    data:
      | {
          id: string
          teacher_id: string
          subject: string
          class_name: string
          visit_date: string
          score: number | null
          status: SupervisionReport['status']
        }[]
      | null
  }

  const reports = rawReports ?? []
  const teacherIds = Array.from(new Set(reports.map((r) => r.teacher_id)))

  let teacherMap = new Map<string, string>()
  if (teacherIds.length > 0) {
    const { data: teachers } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    teacherMap = new Map((teachers ?? []).map((t) => [t.id, t.full_name]))
  }

  const rows: LaporanRow[] = reports.map((r) => ({
    id: r.id,
    teacher_name: teacherMap.get(r.teacher_id) ?? null,
    subject: r.subject,
    class_name: r.class_name,
    visit_date: r.visit_date,
    score: r.score,
    status: r.status,
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Laporan Supervisi
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Kelola laporan hasil observasi guru.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <KepsekLaporanClient initialReports={rows} />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/kepsek/laporan/page.tsx
git commit -m "feat: add kepsek laporan list page"
```

---

## Task 6: Kepsek Laporan Buat Page

**Files:**
- Create: `src/app/dashboard/kepsek/laporan/buat/page.tsx`

- [ ] **Step 1: Buat buat/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import LaporanForm from '@/src/components/dashboard/kepsek/LaporanForm'
import type { Schedule } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatJadwalLabel(s: {
  subject: string
  class_name: string
  scheduled_date: string
}): string {
  const date = new Date(s.scheduled_date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${s.subject} · ${s.class_name} · ${date}`
}

export default async function KepsekLaporanBuatPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const [{ data: gurus }, { data: jadwalSelesai }] = (await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'guru').order('full_name'),
    supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('supervisor_id', user.id)
      .eq('status', 'selesai')
      .order('scheduled_date', { ascending: false }),
  ])) as unknown as [
    { data: { id: string; full_name: string }[] | null },
    { data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null },
  ]

  const guruOptions = (gurus ?? []).map((g) => ({ id: g.id, full_name: g.full_name }))
  const jadwalOptions = (jadwalSelesai ?? []).map((j) => ({
    id: j.id,
    label: formatJadwalLabel(j),
  }))

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            Buat Laporan Supervisi
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Isi formulir laporan hasil observasi.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <LaporanForm
              mode="create"
              guruOptions={guruOptions}
              jadwalOptions={jadwalOptions}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/kepsek/laporan/buat/page.tsx
git commit -m "feat: add kepsek laporan buat page"
```

---

## Task 7: Kepsek Laporan Detail/Edit Page

**Files:**
- Create: `src/app/dashboard/kepsek/laporan/[id]/page.tsx`

- [ ] **Step 1: Buat [id]/page.tsx**

```typescript
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import KepsekSidebar from '@/src/components/dashboard/kepsek/KepsekSidebar'
import LaporanForm from '@/src/components/dashboard/kepsek/LaporanForm'
import LaporanDetailActions from '@/src/components/dashboard/kepsek/LaporanDetailActions'
import type { Schedule, SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatJadwalLabel(s: {
  subject: string
  class_name: string
  scheduled_date: string
}): string {
  const date = new Date(s.scheduled_date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${s.subject} · ${s.class_name} · ${date}`
}

const STATUS_BADGE: Record<
  SupervisionReport['status'],
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
  submitted: {
    label: 'Published',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
}

export default async function KepsekLaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as unknown as { data: { role: string } | null }

  if (!profile || (profile.role !== 'kepsek' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: laporan } = (await supabase
    .from('supervision_reports')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: SupervisionReport | null }

  if (!laporan) notFound()
  if (laporan.supervisor_id !== user.id) redirect('/dashboard/kepsek/laporan')

  const [{ data: gurus }, { data: jadwalSelesai }] = (await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'guru').order('full_name'),
    supabase
      .from('schedules')
      .select('id, subject, class_name, scheduled_date')
      .eq('supervisor_id', user.id)
      .eq('status', 'selesai')
      .order('scheduled_date', { ascending: false }),
  ])) as unknown as [
    { data: { id: string; full_name: string }[] | null },
    { data: Pick<Schedule, 'id' | 'subject' | 'class_name' | 'scheduled_date'>[] | null },
  ]

  const guruOptions = (gurus ?? []).map((g) => ({ id: g.id, full_name: g.full_name }))
  const jadwalOptions = (jadwalSelesai ?? []).map((j) => ({
    id: j.id,
    label: formatJadwalLabel(j),
  }))

  const badge = STATUS_BADGE[laporan.status]

  return (
    <div className="flex h-screen">
      <KepsekSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
                {laporan.subject} · {laporan.class_name}
              </h1>
              <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
                {formatDate(laporan.visit_date)}
              </p>
            </div>
            <span
              className={`inline-block font-body text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Edit Laporan</h2>
            <LaporanForm
              mode="edit"
              initialData={laporan}
              guruOptions={guruOptions}
              jadwalOptions={jadwalOptions}
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
            <h2 className="font-heading text-sm font-bold text-[#002147] mb-4">Tindakan</h2>
            <LaporanDetailActions reportId={laporan.id} status={laporan.status} />
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/kepsek/laporan/[id]/page.tsx
git commit -m "feat: add kepsek laporan detail/edit page"
```

---

## Task 8: Guru Laporan List Page

**Files:**
- Create: `src/app/dashboard/guru/laporan/page.tsx`

- [ ] **Step 1: Buat guru laporan page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : score >= 60
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-block font-body text-sm font-bold px-3 py-0.5 rounded-full ${cls}`}>
      {score}
    </span>
  )
}

export default async function GuruLaporanPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reports } = (await supabase
    .from('supervision_reports')
    .select('id, supervisor_id, subject, class_name, visit_date, score')
    .eq('teacher_id', user.id)
    .eq('status', 'submitted')
    .order('visit_date', { ascending: false })) as unknown as {
    data:
      | {
          id: string
          supervisor_id: string
          subject: string
          class_name: string
          visit_date: string
          score: number | null
        }[]
      | null
  }

  const items = reports ?? []
  const supervisorIds = Array.from(new Set(items.map((r) => r.supervisor_id)))

  let supervisorMap = new Map<string, string>()
  if (supervisorIds.length > 0) {
    const { data: supervisors } = (await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', supervisorIds)) as unknown as {
      data: { id: string; full_name: string }[] | null
    }
    supervisorMap = new Map((supervisors ?? []).map((s) => [s.id, s.full_name]))
  }

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">Laporan Saya</h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            Laporan supervisi yang diterima dari kepala sekolah.
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="font-body text-sm text-slate-500">
                Belum ada laporan supervisi untuk Anda.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((r) => (
                <li key={r.id}>
                  <a
                    href={`/dashboard/guru/laporan/${r.id}`}
                    className="block bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-amber-300 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-slate-900 truncate">
                          {r.subject} · {r.class_name}
                        </p>
                        <p className="font-body text-xs text-slate-500 mt-1">
                          {formatDate(r.visit_date)}
                        </p>
                        <p className="font-body text-xs text-slate-500 mt-0.5">
                          Oleh:{' '}
                          <span className="font-medium text-slate-700">
                            {supervisorMap.get(r.supervisor_id) ?? '—'}
                          </span>
                        </p>
                      </div>
                      <ScoreBadge score={r.score} />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/guru/laporan/page.tsx
git commit -m "feat: add guru laporan list page"
```

---

## Task 9: Guru Laporan Detail Page

**Files:**
- Create: `src/app/dashboard/guru/laporan/[id]/page.tsx`

- [ ] **Step 1: Buat guru laporan [id]/page.tsx**

```typescript
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/src/utils/supabase/server'
import GururSidebar from '@/src/components/dashboard/guru/GururSidebar'
import type { SupervisionReport } from '@/src/types/database'

export const dynamic = 'force-dynamic'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="font-body text-slate-400">Tidak ada nilai</span>
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 60
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200'
  return (
    <div
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${cls}`}
    >
      <span className="font-heading text-2xl font-bold">{score}</span>
    </div>
  )
}

function SectionBlock({
  title,
  content,
}: {
  title: string
  content: string | null
}) {
  if (!content) return null
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5">
      <h2 className="font-heading text-sm font-bold text-[#002147] mb-3">{title}</h2>
      <p className="font-body text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  )
}

export default async function GuruLaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: laporan } = (await supabase
    .from('supervision_reports')
    .select('*')
    .eq('id', id)
    .single()) as unknown as { data: SupervisionReport | null }

  if (!laporan) notFound()
  if (laporan.teacher_id !== user.id || laporan.status !== 'submitted') {
    redirect('/dashboard/guru/laporan')
  }

  const { data: supervisor } = (await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', laporan.supervisor_id)
    .single()) as unknown as { data: { full_name: string } | null }

  return (
    <div className="flex h-screen">
      <GururSidebar />

      <div className="flex-1 bg-slate-50 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-16 pr-4 py-4 md:px-8">
          <h1 className="font-heading text-lg md:text-xl font-bold text-slate-900">
            {laporan.subject} · {laporan.class_name}
          </h1>
          <p className="font-body text-xs md:text-sm text-slate-500 mt-0.5">
            {formatDate(laporan.visit_date)} · Oleh {supervisor?.full_name ?? '—'}
          </p>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto w-full space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 md:px-6 py-5 flex items-center gap-5">
            <ScoreDisplay score={laporan.score} />
            <div>
              <p className="font-body text-xs text-slate-500">Nilai Supervisi</p>
              <p className="font-heading text-sm font-bold text-slate-900 mt-0.5">
                {laporan.score !== null
                  ? laporan.score >= 80
                    ? 'Sangat Baik'
                    : laporan.score >= 60
                    ? 'Cukup Baik'
                    : 'Perlu Peningkatan'
                  : 'Belum dinilai'}
              </p>
            </div>
          </div>

          <SectionBlock title="Kekuatan yang Diamati" content={laporan.strengths} />
          <SectionBlock title="Area yang Perlu Ditingkatkan" content={laporan.improvements} />
          <SectionBlock title="Rekomendasi" content={laporan.recommendations} />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 error baru.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/guru/laporan/[id]/page.tsx
git commit -m "feat: add guru laporan detail page"
```

---

## Verifikasi Akhir

- [ ] **Jalankan dev server**

```bash
npm run dev
```

- [ ] **Test alur kepsek:**
  1. Login sebagai kepsek → sidebar "Analisis Laporan" → halaman list (kosong)
  2. Klik "Buat Laporan" → isi form → Simpan Draft → redirect ke halaman detail
  3. Di detail: edit beberapa field → Simpan Draft → muncul banner "berhasil disimpan"
  4. Klik "Publish ke Guru" → status berubah ke Published → tombol berubah ke "Batalkan Publish"
  5. Klik "Batalkan Publish" → status kembali Draft → tombol "Publish" dan "Hapus" muncul lagi
  6. Klik "Hapus Laporan" → konfirmasi → redirect ke list → laporan hilang

- [ ] **Test alur guru:**
  1. Login sebagai guru → sidebar "Laporan Saya" → halaman list (kosong jika belum ada yang published)
  2. Setelah kepsek publish laporan untuk guru ini → refresh → laporan muncul di list
  3. Klik card → detail laporan (nilai, kekuatan, area peningkatan, rekomendasi)
  4. Coba akses URL laporan guru lain → redirect ke list
