'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/src/utils/supabase/server'
import { createAdminClient } from '@/src/utils/supabase/admin'
import type { VideoStatus } from '@/src/types/database'

export interface VideoPayload {
  title: string
  subject: string
  class_name: string
  video_url: string
  teacher_note?: string | null
  schedule_id?: string | null
}

function validateHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

async function requireGuru(): Promise<{ userId?: string; error?: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }
  return { userId: user.id }
}

async function notifyKepsekOfVideo(args: {
  videoId: string
  guruId: string
  title: string
}) {
  const admin = createAdminClient()

  const { data: guru } = (await admin
    .from('profiles')
    .select('full_name')
    .eq('id', args.guruId)
    .single()) as unknown as { data: { full_name: string } | null }

  const { data: kepseks } = (await admin
    .from('profiles')
    .select('id')
    .eq('role', 'kepsek')) as unknown as { data: { id: string }[] | null }

  if (!kepseks || kepseks.length === 0) return

  const guruName = guru?.full_name ?? 'Seorang guru'
  const title = args.title.trim() || 'Tanpa Judul'

  const rows = kepseks.map((k) => ({
    user_id: k.id,
    title: 'Video mengajar baru menunggu review',
    message: `${guruName} mengirim video "${title}" untuk ditinjau.`,
    link: `/dashboard/kepsek/video/${args.videoId}`,
  }))

  await admin.from('notifications').insert(rows as never)
}

export async function createVideo(
  payload: VideoPayload,
): Promise<{ id?: string; error?: string }> {
  const { userId, error: authErr } = await requireGuru()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!payload.title.trim()) return { error: 'Judul video wajib diisi.' }
  if (!payload.subject.trim()) return { error: 'Mata pelajaran wajib diisi.' }
  if (!payload.class_name.trim()) return { error: 'Kelas wajib diisi.' }

  const videoUrl = validateHttpUrl(payload.video_url.trim())
  if (!videoUrl) {
    return { error: 'Link video tidak valid. Gunakan URL yang diawali http:// atau https://.' }
  }

  const supabase = await createServerClient()
  const row = {
    teacher_id: userId,
    schedule_id: payload.schedule_id || null,
    title: payload.title.trim(),
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    video_url: videoUrl,
    teacher_note: payload.teacher_note?.trim() || null,
    status: 'belum_ditinjau' satisfies VideoStatus,
  }

  const { data, error } = (await supabase
    .from('teaching_videos')
    .insert(row as never)
    .select('id')
    .single()) as unknown as { data: { id: string } | null; error: { message: string } | null }

  if (error || !data) return { error: error?.message ?? 'Gagal mengirim video.' }

  await notifyKepsekOfVideo({ videoId: data.id, guruId: userId, title: row.title })

  revalidatePath('/dashboard/guru/video')
  return { id: data.id }
}

export async function updateVideo(
  payload: VideoPayload & { id: string },
): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireGuru()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  if (!payload.title.trim()) return { error: 'Judul video wajib diisi.' }
  if (!payload.subject.trim()) return { error: 'Mata pelajaran wajib diisi.' }
  if (!payload.class_name.trim()) return { error: 'Kelas wajib diisi.' }

  const videoUrl = validateHttpUrl(payload.video_url.trim())
  if (!videoUrl) {
    return { error: 'Link video tidak valid. Gunakan URL yang diawali http:// atau https://.' }
  }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('teaching_videos')
    .select('teacher_id, status')
    .eq('id', payload.id)
    .single()) as unknown as { data: { teacher_id: string; status: VideoStatus } | null }

  if (!existing) return { error: 'Video tidak ditemukan.' }
  if (existing.teacher_id !== userId) return { error: 'Anda tidak memiliki akses ke video ini.' }
  if (existing.status !== 'belum_ditinjau') {
    return { error: 'Video yang sudah ditinjau tidak dapat diubah.' }
  }

  const updates = {
    schedule_id: payload.schedule_id || null,
    title: payload.title.trim(),
    subject: payload.subject.trim(),
    class_name: payload.class_name.trim(),
    video_url: videoUrl,
    teacher_note: payload.teacher_note?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('teaching_videos')
    .update(updates as never)
    .eq('id', payload.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/video')
  revalidatePath(`/dashboard/guru/video/${payload.id}`)
  return {}
}

export async function deleteVideo(id: string): Promise<{ error?: string }> {
  const { userId, error: authErr } = await requireGuru()
  if (authErr || !userId) return { error: authErr ?? 'Tidak terautentikasi.' }

  const supabase = await createServerClient()

  const { data: existing } = (await supabase
    .from('teaching_videos')
    .select('teacher_id, status')
    .eq('id', id)
    .single()) as unknown as { data: { teacher_id: string; status: VideoStatus } | null }

  if (!existing) return { error: 'Video tidak ditemukan.' }
  if (existing.teacher_id !== userId) return { error: 'Anda tidak memiliki akses ke video ini.' }
  if (existing.status !== 'belum_ditinjau') {
    return { error: 'Video yang sudah ditinjau tidak dapat dihapus.' }
  }

  const { error } = await supabase.from('teaching_videos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/guru/video')
  return {}
}
