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
