'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { ScheduleStatus } from '@/src/types/database'

export interface SchedulePayload {
  id?: string
  teacher_id: string
  scheduled_date: string
  scheduled_time: string
  subject: string
  class_name: string
  notes?: string | null
  zoom_link_pra?: string | null
  zoom_link_pengamatan?: string | null
  zoom_link_pasca?: string | null
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
    return { error: 'Hanya kepala sekolah yang dapat mengatur jadwal.' }
  }
  return { userId: user.id }
}

async function notifyGuru(args: {
  teacherId: string
  title: string
  message: string
}) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: args.teacherId,
    title: args.title,
    message: args.message,
    link: '/dashboard/guru/jadwal',
  } as never)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function createSchedule(
  payload: SchedulePayload,
): Promise<{ id?: string; error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!payload.teacher_id) return { error: 'Pilih guru terlebih dahulu.' }
  if (!payload.scheduled_date) return { error: 'Tanggal wajib diisi.' }
  if (!payload.scheduled_time) return { error: 'Waktu wajib diisi.' }
  if (!payload.subject.trim()) return { error: 'Mata pelajaran wajib diisi.' }
  if (!payload.class_name.trim()) return { error: 'Kelas wajib diisi.' }

  const supabase = await createServerClient()
  const row = {
    supervisor_id: userId,
    teacher_id: payload.teacher_id,
    scheduled_date: payload.scheduled_date,
    scheduled_time: payload.scheduled_time,
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    notes: payload.notes?.trim() || null,
    zoom_link_pra: payload.zoom_link_pra?.trim() || null,
    zoom_link_pengamatan: payload.zoom_link_pengamatan?.trim() || null,
    zoom_link_pasca: payload.zoom_link_pasca?.trim() || null,
    status: 'dijadwalkan' satisfies ScheduleStatus,
  }
  const { data, error } = (await supabase
    .from('schedules')
    .insert(row as never)
    .select('id')
    .single()) as unknown as {
    data: { id: string } | null
    error: { message: string } | null
  }

  if (error || !data) return { error: error?.message ?? 'Gagal membuat jadwal.' }

  await notifyGuru({
    teacherId: payload.teacher_id,
    title: 'Anda dijadwalkan supervisi',
    message: `Supervisi ${row.subject} (${row.class_name}) pada ${formatDate(row.scheduled_date)} ${row.scheduled_time.slice(0, 5)}.`,
  })

  revalidatePath('/dashboard/kepsek/jadwal')
  revalidatePath('/dashboard/guru/jadwal')
  return { id: data.id }
}

export async function updateSchedule(
  payload: SchedulePayload & { id: string },
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('schedules')
    .select('teacher_id, scheduled_date, scheduled_time, subject, class_name, status')
    .eq('id', payload.id)
    .single()) as unknown as {
    data: {
      teacher_id: string
      scheduled_date: string
      scheduled_time: string
      subject: string
      class_name: string
      status: ScheduleStatus
    } | null
  }

  if (!existing) return { error: 'Jadwal tidak ditemukan.' }
  if (existing.status !== 'dijadwalkan') {
    return { error: 'Hanya jadwal berstatus dijadwalkan yang dapat diubah.' }
  }

  const updates = {
    teacher_id: payload.teacher_id,
    scheduled_date: payload.scheduled_date,
    scheduled_time: payload.scheduled_time,
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    notes: payload.notes?.trim() || null,
    zoom_link_pra: payload.zoom_link_pra?.trim() || null,
    zoom_link_pengamatan: payload.zoom_link_pengamatan?.trim() || null,
    zoom_link_pasca: payload.zoom_link_pasca?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('schedules')
    .update(updates as never)
    .eq('id', payload.id)

  if (error) return { error: error.message }

  const scheduleChanged =
    existing.scheduled_date !== payload.scheduled_date ||
    existing.scheduled_time !== payload.scheduled_time ||
    existing.teacher_id !== payload.teacher_id

  if (scheduleChanged) {
    if (existing.teacher_id !== payload.teacher_id) {
      await notifyGuru({
        teacherId: existing.teacher_id,
        title: 'Jadwal supervisi dipindahkan',
        message: `Supervisi ${existing.subject} (${existing.class_name}) yang dijadwalkan untuk Anda telah dipindahkan ke guru lain.`,
      })
    }
    await notifyGuru({
      teacherId: payload.teacher_id,
      title: 'Jadwal supervisi diperbarui',
      message: `Supervisi ${updates.subject} (${updates.class_name}) kini ${formatDate(updates.scheduled_date)} ${updates.scheduled_time.slice(0, 5)}.`,
    })
  }

  revalidatePath('/dashboard/kepsek/jadwal')
  revalidatePath('/dashboard/guru/jadwal')
  return {}
}

export async function cancelSchedule(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('schedules')
    .select('teacher_id, subject, class_name, scheduled_date, status')
    .eq('id', id)
    .single()) as unknown as {
    data: {
      teacher_id: string
      subject: string
      class_name: string
      scheduled_date: string
      status: ScheduleStatus
    } | null
  }

  if (!existing) return { error: 'Jadwal tidak ditemukan.' }
  if (existing.status !== 'dijadwalkan') {
    return { error: 'Hanya jadwal berstatus dijadwalkan yang dapat dibatalkan.' }
  }

  const { error } = await supabase
    .from('schedules')
    .update({
      status: 'dibatalkan' satisfies ScheduleStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  if (error) return { error: error.message }

  await notifyGuru({
    teacherId: existing.teacher_id,
    title: 'Jadwal supervisi dibatalkan',
    message: `Supervisi ${existing.subject} (${existing.class_name}) pada ${formatDate(existing.scheduled_date)} telah dibatalkan.`,
  })

  revalidatePath('/dashboard/kepsek/jadwal')
  revalidatePath('/dashboard/guru/jadwal')
  return {}
}

export async function completeSchedule(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireKepsek()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('schedules')
    .update({
      status: 'selesai' satisfies ScheduleStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/kepsek/jadwal')
  revalidatePath('/dashboard/guru/jadwal')
  return {}
}
