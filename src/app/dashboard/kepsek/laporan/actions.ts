'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { ReportStatus, RtlItem, DocItem, SpvcData } from '@/src/types/database'
import { isSpvcColumn, getSpvcForm, type SpvcColumn } from '@/src/lib/spvc-forms'

export type InstrumentType = 'administrasi' | 'modul_ajar' | 'pelaksanaan'

function sanitizeRtl(items: RtlItem[] | null | undefined): RtlItem[] | null {
  if (!items || !Array.isArray(items)) return null
  const cleaned = items
    .map((it) => ({
      masalah: (it.masalah ?? '').trim(),
      aksi: (it.aksi ?? '').trim(),
      target: (it.target ?? '').trim(),
    }))
    .filter((it) => it.masalah || it.aksi || it.target)
  return cleaned.length > 0 ? cleaned : null
}

export interface LaporanPayload {
  teacher_id: string
  visit_date: string
  subject: string
  class_name: string
  jam_ke?: string | null
  materi?: string | null
  score?: number | null
  schedule_id?: string | null
  instrument_type?: InstrumentType
  observation_scores?: Record<string, number> | null
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
  if (payload.score !== null && payload.score !== undefined) {
    if (!Number.isFinite(payload.score) || payload.score < 0 || payload.score > 100) {
      return { error: 'Nilai harus berupa angka antara 0 dan 100.' }
    }
  }

  const supabase = await createServerClient()
  const row = {
    supervisor_id: userId,
    teacher_id: payload.teacher_id,
    visit_date: payload.visit_date,
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    jam_ke: payload.jam_ke?.trim() || null,
    materi: payload.materi?.trim() || null,
    score: payload.score ?? null,
    schedule_id: payload.schedule_id || null,
    instrument_type: payload.instrument_type ?? 'pelaksanaan',
    observation_scores: payload.observation_scores ?? null,
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
  if (payload.score !== null && payload.score !== undefined) {
    if (!Number.isFinite(payload.score) || payload.score < 0 || payload.score > 100) {
      return { error: 'Nilai harus berupa angka antara 0 dan 100.' }
    }
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
    jam_ke: payload.jam_ke?.trim() || null,
    materi: payload.materi?.trim() || null,
    score: payload.score ?? null,
    schedule_id: payload.schedule_id || null,
    instrument_type: payload.instrument_type ?? 'pelaksanaan',
    observation_scores: payload.observation_scores ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('supervision_reports')
    .update(updates as never)
    .eq('id', payload.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kepsek/laporan')
  revalidatePath(`/dashboard/kepsek/laporan/${payload.id}`)
  revalidatePath('/dashboard/guru/laporan')
  revalidatePath(`/dashboard/guru/laporan/${payload.id}`)
  return {}
}

export async function publishLaporan(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id, teacher_id, subject, class_name, status')
    .eq('id', id)
    .single()) as unknown as {
    data: {
      supervisor_id: string
      teacher_id: string
      subject: string
      class_name: string
      status: ReportStatus
    } | null
  }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) return { error: 'Anda tidak memiliki akses ke laporan ini.' }
  if (existing.status === 'submitted') return {}

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

const MAX_DOCS = 12

function sanitizeDocs(items: DocItem[] | null | undefined): DocItem[] {
  if (!Array.isArray(items)) return []
  return items
    .filter(
      (it): it is DocItem =>
        !!it &&
        typeof it.url === 'string' &&
        /^https?:\/\//.test(it.url) &&
        (it.type === 'image' || it.type === 'video' || it.type === 'file'),
    )
    .map((it) => ({
      url: it.url,
      name: (it.name ?? '').slice(0, 200),
      type: it.type,
    }))
    .slice(0, MAX_DOCS)
}

/** Menyimpan formulir RTL (SPVC-07/08) secara mandiri. */
export async function updateLaporanRtl(
  reportId: string,
  items: RtlItem[],
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id')
    .eq('id', reportId)
    .single()) as unknown as { data: { supervisor_id: string } | null }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) {
    return { error: 'Anda tidak memiliki akses ke laporan ini.' }
  }

  const { error } = await supabase
    .from('supervision_reports')
    .update({
      rtl_items: sanitizeRtl(items),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/kepsek/laporan/${reportId}`)
  revalidatePath(`/dashboard/guru/laporan/${reportId}`)
  return {}
}

/**
 * Menyimpan satu formulir SPVC naratif (SPVC-04/05/06/09).
 * Nama kolom divalidasi terhadap whitelist, dan hanya field yang
 * terdefinisi pada formulir tersebut yang disimpan.
 */
export async function updateSpvcForm(
  reportId: string,
  column: string,
  data: SpvcData,
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!isSpvcColumn(column)) return { error: 'Formulir tidak dikenali.' }
  const def = getSpvcForm(column as SpvcColumn)
  if (!def) return { error: 'Formulir tidak dikenali.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id')
    .eq('id', reportId)
    .single()) as unknown as { data: { supervisor_id: string } | null }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) {
    return { error: 'Anda tidak memiliki akses ke laporan ini.' }
  }

  // Hanya terima field yang terdaftar pada definisi formulir
  const cleaned: SpvcData = {}
  for (const field of def.fields) {
    const value = (data?.[field.key] ?? '').trim()
    if (value) cleaned[field.key] = value
  }

  const { error } = await supabase
    .from('supervision_reports')
    .update({
      [column]: Object.keys(cleaned).length > 0 ? cleaned : null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/kepsek/laporan/${reportId}`)
  revalidatePath(`/dashboard/guru/laporan/${reportId}`)
  return {}
}

export async function updateLaporanDokumentasi(
  reportId: string,
  docs: DocItem[],
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('supervision_reports')
    .select('supervisor_id')
    .eq('id', reportId)
    .single()) as unknown as { data: { supervisor_id: string } | null }

  if (!existing) return { error: 'Laporan tidak ditemukan.' }
  if (existing.supervisor_id !== userId) {
    return { error: 'Anda tidak memiliki akses ke laporan ini.' }
  }

  const cleaned = sanitizeDocs(docs)

  const { error } = await supabase
    .from('supervision_reports')
    .update({
      documentation_urls: cleaned.length > 0 ? cleaned : null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/kepsek/laporan/${reportId}`)
  revalidatePath(`/dashboard/guru/laporan/${reportId}`)
  return {}
}
